const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(appPath) {
    this.configPath = path.join(appPath, 'config.json');
    this.defaultConfig = {
      downloadDir: '',
      connections: 16,
      container: 'mp4',
      chunkSize: '10M',
      prefer60fps: true,
      fpsMode: 'all',
      batchQuality: 'best'
    };
    this.config = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        return { ...this.defaultConfig, ...parsed };
      }

      // Out-of-the-box: initialize config.json from config.example.json if present
      const examplePath = path.join(this.appPath, 'config.example.json');
      if (fs.existsSync(examplePath)) {
        const rawExample = fs.readFileSync(examplePath, 'utf8');
        const parsedExample = JSON.parse(rawExample);
        const initial = { ...this.defaultConfig, ...parsedExample };
        this.save(initial);
        return initial;
      }
    } catch (err) {
      console.error('Lỗi khi đọc config.json:', err);
    }
    // Write defaults if not existing
    this.save(this.defaultConfig);
    return { ...this.defaultConfig };
  }

  save(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return this.config;
    } catch (err) {
      console.error('Lỗi khi lưu config.json:', err);
      throw err;
    }
  }

  get() {
    return this.config;
  }
}

module.exports = ConfigManager;
