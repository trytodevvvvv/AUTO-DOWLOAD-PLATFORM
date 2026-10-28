const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class Downloader {
  constructor(binManager) {
    this.binManager = binManager;
    this.activeProcesses = new Map(); // id -> child_process
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds) {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Check URL & extract detailed metadata
  async getVideoInfo(url) {
    const paths = this.binManager.getPaths();
    if (!paths.ytdlp) {
      throw new Error('Chưa tìm thấy engine yt-dlp. Hãy tải hoặc cập nhật engine trước.');
    }

    return new Promise((resolve, reject) => {
      const args = [
        '--dump-single-json',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--skip-download',
        url
      ];

      const proc = spawn(paths.ytdlp, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          const errMessage = stderr.trim() || 'Không thể lấy thông tin video. Vui lòng kiểm tra lại URL.';
          return reject(new Error(errMessage));
        }

        try {
          const data = JSON.parse(stdout);
          const parsed = this.parseVideoInfo(data);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Lỗi phân tích dữ liệu video từ YouTube: ' + err.message));
        }
      });

      proc.on('error', (err) => {
        reject(new Error('Không thể khởi chạy engine yt-dlp: ' + err.message));
      });
    });
  }

  parseVideoInfo(data) {
    const formats = data.formats || [];

    // Find best audio size
    const audioFormats = formats.filter(f => f.acodec !== 'none' && f.vcodec === 'none');
    audioFormats.sort((a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0));
    const bestAudio = audioFormats[0] || null;
    const bestAudioSize = bestAudio ? (bestAudio.filesize || bestAudio.filesize_approx || 0) : 0;

    // Filter video streams (with or without audio)
    // Key by height and fpsGroup (60 vs 30) so user can choose high frame rate or small file size
    const videoMap = new Map(); // key -> { format, score, fps, vcodec, filesize, height, is60 }

    for (const f of formats) {
      if (!f.height || f.vcodec === 'none') continue;

      const height = f.height;
      const fFps = f.fps || 30;
      const is60 = fFps >= 50;
      const key = `${height}_${is60 ? '60' : '30'}`;

      const current = videoMap.get(key);
      const fSize = f.filesize || f.filesize_approx || 0;
      const isH264 = (f.vcodec || '').toLowerCase().includes('avc');

      // Score this format
      const score = (isH264 ? 100 : 50) + (fSize / 1000000);

      if (!current || score > current.score) {
        videoMap.set(key, {
          format: f,
          score: score,
          fps: fFps,
          is60: is60,
          height: height,
          vcodec: f.vcodec,
          filesize: fSize
        });
      }
    }

    // Sort items by height descending, then 60fps before 30fps
    const items = Array.from(videoMap.values()).sort((a, b) => {
      if (b.height !== a.height) return b.height - a.height;
      return (b.is60 ? 1 : 0) - (a.is60 ? 1 : 0);
    });

    const videoOptions = [];

    for (const item of items) {
      const h = item.height;
      const f = item.format;
      const totalEstimatedBytes = (item.filesize > 0 ? item.filesize : 0) + (f.acodec === 'none' ? bestAudioSize : 0);

      let label = `${h}p`;
      if (h >= 4320) label = `8K (${h}p)`;
      else if (h >= 2160) label = `4K Ultra HD (${h}p)`;
      else if (h >= 1440) label = `2K Quad HD (${h}p)`;
      else if (h >= 1080) label = `Full HD (${h}p)`;
      else if (h >= 720) label = `HD (${h}p)`;
      else label = `SD (${h}p)`;

      if (item.is60) {
        label += ` ${item.fps}fps (Siêu mượt)`;
      } else {
        label += ` 30fps (Tiết kiệm)`;
      }

      const formatSpec = item.is60
        ? `bestvideo[height<=${h}][fps>30]+bestaudio/best[height<=${h}]`
        : `bestvideo[height<=${h}][fps<=30]+bestaudio/best[height<=${h}]`;

      videoOptions.push({
        height: h,
        label: label,
        fps: item.fps,
        is60: item.is60,
        codec: (item.vcodec || '').split('.')[0],
        estimatedBytes: totalEstimatedBytes,
        estimatedSizeStr: totalEstimatedBytes > 0 ? this.formatBytes(totalEstimatedBytes) : 'Ước lượng theo luồng',
        formatId: formatSpec,
        isLarge: totalEstimatedBytes >= 1073741824 // >= 1GB
      });
    }

    return {
      id: data.id,
      title: data.title,
      uploader: data.uploader || data.channel || 'Không rõ',
      duration: data.duration,
      durationStr: this.formatDuration(data.duration),
      thumbnail: data.thumbnail,
      viewCount: data.view_count ? data.view_count.toLocaleString('vi-VN') : '0',
      uploadDate: data.upload_date || '',
      webpageUrl: data.webpage_url,
      videoOptions: videoOptions,
      bestAudioSizeStr: bestAudioSize > 0 ? this.formatBytes(bestAudioSize) : 'Nhỏ'
    };
  }

  // Accelerated Download
  async startDownload(id, options, onProgress, onStatusChange) {
    const paths = this.binManager.getPaths();
    if (!paths.ytdlp) throw new Error('Thiếu engine yt-dlp');

    const downloadDir = options.downloadDir || path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const outputTemplate = path.join(downloadDir, '%(title)s [%(resolution)s].%(ext)s');

    const args = [
      options.url,
      '-o', outputTemplate,
      '--no-playlist',
      '--newline',
      '--progress',
      '--no-mtime'
    ];

    // Set ffmpeg location
    if (paths.ffmpeg) {
      args.push('--ffmpeg-location', path.dirname(paths.ffmpeg));
    } else if (options.isAudioOnly || !options.formatId || options.formatId.includes('+')) {
      throw new Error('Chưa tìm thấy thư viện FFmpeg để ghép hình & tiếng. Vui lòng vào tab "Cấu hình tốc độ" và nhấn "Cài đặt FFmpeg (Tự động)".');
    }

    // Audio or Video selection
    if (options.isAudioOnly) {
      args.push('-x');
      args.push('--audio-format', options.audioFormat || 'mp3');
      args.push('--audio-quality', '0'); // highest quality
    } else {
      args.push('-f', options.formatId || 'bestvideo+bestaudio/best');
      args.push('--merge-output-format', options.container || 'mp4');
    }

    // High Speed Accelerator Engine (aria2c or multi-chunk)
    const connections = options.connections || 16;
    if (paths.aria2c && options.useAria2 !== false) {
      args.push('--external-downloader', 'aria2c');
      args.push(
        '--external-downloader-args',
        `aria2c:-x ${connections} -s ${connections} -j ${connections} -k 1M --min-split-size=1M --summary-interval=1`
      );
    } else {
      // Native yt-dlp chunking & concurrent fragments
      args.push('--concurrent-fragments', `${connections}`);
      args.push('--http-chunk-size', '10M');
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(paths.ytdlp, args);
      this.activeProcesses.set(id, proc);

      let finalFilePath = '';
      let currentStage = options.isAudioOnly ? 'audio' : 'video';
      let currentGid = null;
      let streamIndex = 0;
      let lastUnifiedPercent = 0;

      onStatusChange({ id, status: 'downloading', message: 'Đang khởi tạo đa luồng với tốc độ tối đa...' });

      const handleOutput = (data) => {
        const text = data.toString();
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Track stream switches
          if (trimmed.includes('[download] Destination:') || trimmed.includes('has already been downloaded')) {
            const match = trimmed.match(/(?:Destination:\s+|\[download\]\s+)(.+?)(?:\s+has already|$)/);
            if (match && !finalFilePath) {
              finalFilePath = match[1].trim();
            }
            streamIndex++;
            if (!options.isAudioOnly && streamIndex >= 2 && currentStage === 'video') {
              currentStage = 'audio';
            }
          }

          // Detect aria2c progress: [#abcdef 450MiB/1.2GiB(37%) CN:16 DL:42MiB ETA:18s]
          const ariaMatch = trimmed.match(/\[#(\w+)\s+([\d\.]+\w+)\/([\d\.]+\w+)\((\d+)%\)\s+CN:(\d+)\s+DL:([\d\.]+\w+)(?:\s+ETA:([\w\d]+))?\]/);
          if (ariaMatch) {
            const gid = ariaMatch[1];
            const downloaded = ariaMatch[2];
            const total = ariaMatch[3];
            const rawPercent = parseInt(ariaMatch[4], 10);
            const conns = ariaMatch[5];
            const speed = ariaMatch[6] + '/s';
            const eta = ariaMatch[7] || '--';

            if (!currentGid) {
              currentGid = gid;
            } else if (currentGid !== gid) {
              currentGid = gid;
              if (!options.isAudioOnly && currentStage === 'video') {
                currentStage = 'audio';
              }
            }

            if (!options.isAudioOnly && currentStage === 'video' && rawPercent < 20 && lastUnifiedPercent >= 75) {
              currentStage = 'audio';
            }

            let unifiedPercent = 0;
            let stageTitle = '';

            if (options.isAudioOnly) {
              if (currentStage === 'extracting') {
                unifiedPercent = 95;
                stageTitle = 'Trích xuất âm thanh';
              } else {
                unifiedPercent = Math.min(92, Math.round(rawPercent * 0.92));
                stageTitle = 'Đang tải âm thanh';
              }
            } else {
              if (currentStage === 'video') {
                unifiedPercent = Math.min(85, Math.round(rawPercent * 0.85));
                stageTitle = 'Đang tải hình ảnh (Video)';
              } else if (currentStage === 'audio') {
                unifiedPercent = 85 + Math.min(10, Math.round(rawPercent * 0.10));
                stageTitle = 'Đang tải âm thanh (Audio)';
              } else if (currentStage === 'merging') {
                unifiedPercent = 96;
                stageTitle = 'Đang ghép luồng (Stream-copy)';
              }
            }

            if (unifiedPercent < lastUnifiedPercent) {
              unifiedPercent = lastUnifiedPercent;
            } else {
              lastUnifiedPercent = unifiedPercent;
            }

            onProgress({
              id,
              percent: unifiedPercent,
              rawPercent,
              stage: currentStage,
              stageTitle,
              downloaded,
              total,
              speed,
              eta,
              connections: conns,
              engine: 'aria2c'
            });
            continue;
          }

          // Detect yt-dlp native progress: [download]  45.2% of ~  1.45GiB at   38.5MiB/s ETA 00:22
          const ytdlMatch = trimmed.match(/\[download\]\s+([\d\.]+)%\s+of\s+~?\s*([\d\.]+\w+)\s+at\s+([\d\.]+\w+\/s)\s+ETA\s+([\d:]+)/);
          if (ytdlMatch) {
            const rawPercent = parseFloat(ytdlMatch[1]);
            const total = ytdlMatch[2];
            const speed = ytdlMatch[3];
            const eta = ytdlMatch[4];

            if (!options.isAudioOnly && currentStage === 'video' && rawPercent < 20 && lastUnifiedPercent >= 75) {
              currentStage = 'audio';
            }

            let unifiedPercent = 0;
            let stageTitle = '';

            if (options.isAudioOnly) {
              if (currentStage === 'extracting') {
                unifiedPercent = 95;
                stageTitle = 'Trích xuất âm thanh';
              } else {
                unifiedPercent = Math.min(92, Math.round(rawPercent * 0.92));
                stageTitle = 'Đang tải âm thanh';
              }
            } else {
              if (currentStage === 'video') {
                unifiedPercent = Math.min(85, Math.round(rawPercent * 0.85));
                stageTitle = 'Đang tải hình ảnh (Video)';
              } else if (currentStage === 'audio') {
                unifiedPercent = 85 + Math.min(10, Math.round(rawPercent * 0.10));
                stageTitle = 'Đang tải âm thanh (Audio)';
              } else if (currentStage === 'merging') {
                unifiedPercent = 96;
                stageTitle = 'Đang ghép luồng (Stream-copy)';
              }
            }

            if (unifiedPercent < lastUnifiedPercent) {
              unifiedPercent = lastUnifiedPercent;
            } else {
              lastUnifiedPercent = unifiedPercent;
            }

            onProgress({
              id,
              percent: unifiedPercent,
              rawPercent: Math.round(rawPercent),
              stage: currentStage,
              stageTitle,
              total,
              speed,
              eta,
              engine: 'yt-dlp'
            });
            continue;
          }

          // Detect Merging phase: [Merger] Merging formats into "..."
          if (trimmed.includes('[Merger]') || trimmed.includes('Merging formats into')) {
            const match = trimmed.match(/Merging formats into ["'](.+?)["']/);
            if (match) finalFilePath = match[1];
            currentStage = 'merging';
            lastUnifiedPercent = Math.max(lastUnifiedPercent, 96);
            onProgress({
              id,
              percent: lastUnifiedPercent,
              stage: 'merging',
              stageTitle: 'Đang đóng gói file (Stream Copy)',
              speed: 'GHÉP FILE',
              eta: '00:01'
            });
            onStatusChange({
              id,
              status: 'merging',
              percent: lastUnifiedPercent,
              message: 'Đang đóng gói file MP4 hoàn chỉnh (FFmpeg Stream Copy)...'
            });
            continue;
          }

          // Detect audio extraction
          if (trimmed.includes('[ExtractAudio]')) {
            currentStage = 'extracting';
            lastUnifiedPercent = Math.max(lastUnifiedPercent, 95);
            onProgress({
              id,
              percent: lastUnifiedPercent,
              stage: 'extracting',
              stageTitle: 'Đang chuyển đổi âm thanh',
              speed: 'XỬ LÝ',
              eta: '00:01'
            });
            onStatusChange({
              id,
              status: 'extracting',
              percent: lastUnifiedPercent,
              message: 'Đang trích xuất và chuyển đổi âm thanh chất lượng cao...'
            });
            continue;
          }
        }
      };

      proc.stdout.on('data', handleOutput);
      proc.stderr.on('data', handleOutput);

      proc.on('close', (code) => {
        this.activeProcesses.delete(id);
        if (code === 0) {
          lastUnifiedPercent = 100;
          onProgress({
            id,
            percent: 100,
            stage: 'completed',
            stageTitle: 'Hoàn tất 100%',
            speed: 'Xong!',
            eta: '00:00'
          });
          onStatusChange({
            id,
            status: 'completed',
            percent: 100,
            message: 'Tải và đóng gói video hoàn tất 100%!',
            filePath: finalFilePath || downloadDir
          });
          resolve({ id, success: true, filePath: finalFilePath });
        } else {
          onStatusChange({ id, status: 'error', message: 'Quá trình tải thất bại hoặc đã bị dừng.' });
          reject(new Error(`Quá trình tải kết thúc với mã lỗi ${code}`));
        }
      });

      proc.on('error', (err) => {
        this.activeProcesses.delete(id);
        onStatusChange({ id, status: 'error', message: 'Lỗi tiến trình tải: ' + err.message });
        reject(err);
      });
    });
  }

  cancelDownload(id) {
    const proc = this.activeProcesses.get(id);
    if (proc) {
      try {
        // Kill tree on Windows
        spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
      } catch (e) {
        proc.kill('SIGTERM');
      }
      this.activeProcesses.delete(id);
      return true;
    }
    return false;
  }
}

module.exports = Downloader;
