const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { execSync, spawn } = require('child_process');

class BinManager {
  constructor(appPath) {
    this.appPath = appPath;
    this.binDir = path.join(this.appPath, 'bin');
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }
  }

  getPaths() {
    return {
      binDir: this.binDir,
      ytdlp: this.findBinary('yt-dlp.exe', 'yt-dlp'),
      aria2c: this.findBinary('aria2c.exe', 'aria2c'),
      ffmpeg: this.findFfmpeg()
    };
  }

  findBinary(filename, commandName) {
    // 1. Check local bin/
    const localPath = path.join(this.binDir, filename);
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    // 2. Check system PATH
    try {
      const out = execSync(`where.exe ${commandName}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const firstLine = out.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        return firstLine;
      }
    } catch (e) {
      // not in path
    }

    return null;
  }

  findFfmpeg() {
    // 1. Check local bin/
    const localPath = path.join(this.binDir, 'ffmpeg.exe');
    if (fs.existsSync(localPath)) return localPath;

    // 2. Check system PATH
    try {
      const out = execSync('where.exe ffmpeg', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const firstLine = out.split(/\r?\n/)[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) return firstLine;
    } catch (e) {}

    // 3. Relative search in parent directory (if ffmpeg was extracted alongside project)
    try {
      const parentDir = path.resolve(this.appPath, '..');
      const entries = fs.readdirSync(parentDir);
      for (const entry of entries) {
        if (entry.toLowerCase().includes('ffmpeg')) {
          const candidate1 = path.join(parentDir, entry, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(candidate1)) return candidate1;
          const candidate2 = path.join(parentDir, entry, entry, 'bin', 'ffmpeg.exe');
          if (fs.existsSync(candidate2)) return candidate2;
        }
      }
    } catch (e) {}

    return null;
  }

  async checkStatus() {
    const paths = this.getPaths();
    return {
      ytdlp: {
        exists: !!paths.ytdlp,
        path: paths.ytdlp,
        version: paths.ytdlp ? await this.getVersion(paths.ytdlp, '--version') : null
      },
      aria2c: {
        exists: !!paths.aria2c,
        path: paths.aria2c,
        version: paths.aria2c ? await this.getVersion(paths.aria2c, '-v') : null
      },
      ffmpeg: {
        exists: !!paths.ffmpeg,
        path: paths.ffmpeg,
        version: paths.ffmpeg ? await this.getVersion(paths.ffmpeg, '-version') : null
      }
    };
  }

  getVersion(binPath, arg) {
    return new Promise((resolve) => {
      try {
        const proc = spawn(binPath, [arg]);
        let output = '';
        proc.stdout.on('data', (d) => (output += d.toString()));
        proc.on('close', () => {
          const firstLine = output.trim().split(/\r?\n/)[0] || '';
          resolve(firstLine);
        });
        proc.on('error', () => resolve('Error checking version'));
      } catch (err) {
        resolve('Unknown');
      }
    });
  }

  // Follow redirects download helper
  downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const request = (currentUrl) => {
        const client = currentUrl.startsWith('https') ? https : http;
        client.get(currentUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return request(res.headers.location);
          }
          if (res.statusCode !== 200) {
            file.close();
            fs.unlink(destPath, () => {});
            return reject(new Error(`Server returned HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
          let downloadedBytes = 0;

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            file.write(chunk);
            if (totalBytes && onProgress) {
              const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              onProgress({ percent, downloadedBytes, totalBytes });
            }
          });

          res.on('end', () => {
            file.end();
          });

          file.on('finish', () => {
            file.close(() => resolve(destPath));
          });
        }).on('error', (err) => {
          file.close();
          fs.unlink(destPath, () => {});
          reject(err);
        });
      };

      request(url);
    });
  }

  async installYtDlp(onProgress) {
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    const dest = path.join(this.binDir, 'yt-dlp.exe');
    const tempDest = dest + '.tmp';
    await this.downloadFile(url, tempDest, onProgress);
    if (fs.existsSync(dest)) {
      try { fs.unlinkSync(dest); } catch (e) {}
    }
    fs.renameSync(tempDest, dest);
    return dest;
  }

  async installAria2c(onProgress) {
    // Official aria2 release zip
    const url = 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip';
    const zipDest = path.join(this.binDir, 'aria2.zip');
    await this.downloadFile(url, zipDest, onProgress);

    // Extract aria2c.exe using PowerShell Expand-Archive
    const extractDir = path.join(this.binDir, 'aria2_temp');
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

    try {
      const res = spawn('tar.exe', ['-xf', 'aria2.zip', '-C', 'aria2_temp'], { cwd: this.binDir });
      await new Promise((resolve, reject) => {
        res.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`tar extraction failed with code ${code}`));
        });
        res.on('error', reject);
      });
      
      // Find aria2c.exe in extracted folder
      const findAria = (dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) {
            const found = findAria(full);
            if (found) return found;
          } else if (file.toLowerCase() === 'aria2c.exe') {
            return full;
          }
        }
        return null;
      };

      const extractedAria = findAria(extractDir);
      if (extractedAria) {
        const targetAria = path.join(this.binDir, 'aria2c.exe');
        if (fs.existsSync(targetAria)) {
          try { fs.unlinkSync(targetAria); } catch (e) {}
        }
        fs.copyFileSync(extractedAria, targetAria);
      } else {
        throw new Error('aria2c.exe not found in extracted archive');
      }
    } finally {
      // Cleanup temp files
      try { fs.unlinkSync(zipDest); } catch (e) {}
      try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch (e) {}
    }

    return path.join(this.binDir, 'aria2c.exe');
  }

  async installFfmpeg(onProgress) {
    const url = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';
    const zipDest = path.join(this.binDir, 'ffmpeg.zip');
    await this.downloadFile(url, zipDest, onProgress);

    const extractDir = path.join(this.binDir, 'ffmpeg_temp');
    if (!fs.existsSync(extractDir)) fs.mkdirSync(extractDir, { recursive: true });

    try {
      const res = spawn('tar.exe', ['-xf', 'ffmpeg.zip', '-C', 'ffmpeg_temp'], { cwd: this.binDir });
      await new Promise((resolve, reject) => {
        res.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`tar extraction failed with code ${code}`));
        });
        res.on('error', reject);
      });

      const findBinaryInDir = (dir, targetName) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const full = path.join(dir, file);
          if (fs.statSync(full).isDirectory()) {
            const found = findBinaryInDir(full, targetName);
            if (found) return found;
          } else if (file.toLowerCase() === targetName.toLowerCase()) {
            return full;
          }
        }
        return null;
      };

      const extractedFfmpeg = findBinaryInDir(extractDir, 'ffmpeg.exe');
      if (extractedFfmpeg) {
        const targetFfmpeg = path.join(this.binDir, 'ffmpeg.exe');
        if (fs.existsSync(targetFfmpeg)) {
          try { fs.unlinkSync(targetFfmpeg); } catch (e) {}
        }
        fs.copyFileSync(extractedFfmpeg, targetFfmpeg);

        const extractedFfprobe = findBinaryInDir(extractDir, 'ffprobe.exe');
        if (extractedFfprobe) {
          const targetFfprobe = path.join(this.binDir, 'ffprobe.exe');
          if (fs.existsSync(targetFfprobe)) {
            try { fs.unlinkSync(targetFfprobe); } catch (e) {}
          }
          fs.copyFileSync(extractedFfprobe, targetFfprobe);
        }
      } else {
        throw new Error('Không tìm thấy file ffmpeg.exe trong gói giải nén');
      }
    } finally {
      try { if (fs.existsSync(zipDest)) fs.unlinkSync(zipDest); } catch (e) {}
      try { if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true }); } catch (e) {}
    }

    return path.join(this.binDir, 'ffmpeg.exe');
  }

  async updateYtDlp() {
    const paths = this.getPaths();
    if (!paths.ytdlp) {
      return await this.installYtDlp();
    }
    return new Promise((resolve, reject) => {
      const proc = spawn(paths.ytdlp, ['-U']);
      let output = '';
      proc.stdout.on('data', d => output += d.toString());
      proc.stderr.on('data', d => output += d.toString());
      proc.on('close', code => {
        resolve({ code, output });
      });
      proc.on('error', err => reject(err));
    });
  }
}

module.exports = BinManager;
