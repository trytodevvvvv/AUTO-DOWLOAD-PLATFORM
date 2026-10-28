const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Configuration persistence
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (newConfig) => ipcRenderer.invoke('config:save', newConfig),

  // Binary / Engine management
  checkBinaries: () => ipcRenderer.invoke('engine:check'),
  installBinary: (name) => ipcRenderer.invoke('engine:install', name),
  updateYtDlp: () => ipcRenderer.invoke('engine:update-ytdlp'),

  // Video Inspection
  getVideoInfo: (url) => ipcRenderer.invoke('video:get-info', url),

  // Video Download
  startDownload: (options) => ipcRenderer.invoke('video:start-download', options),
  cancelDownload: (id) => ipcRenderer.invoke('video:cancel-download', id),

  // System dialogs and shell
  selectDirectory: (defaultPath) => ipcRenderer.invoke('dialog:select-directory', defaultPath),
  openFile: (filePath) => ipcRenderer.invoke('shell:open-file', filePath),
  openFolder: (filePath) => ipcRenderer.invoke('shell:open-folder', filePath),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),

  // Event Listeners
  onDownloadProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download:progress', subscription);
    return () => ipcRenderer.removeListener('download:progress', subscription);
  },
  onDownloadStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('download:status', subscription);
    return () => ipcRenderer.removeListener('download:status', subscription);
  },
  onEngineProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('engine:progress', subscription);
    return () => ipcRenderer.removeListener('engine:progress', subscription);
  },
  onRestoreNormal: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('app:restore-normal', subscription);
    return () => ipcRenderer.removeListener('app:restore-normal', subscription);
  }
});
