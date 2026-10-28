const { app, BrowserWindow, ipcMain, dialog, shell, clipboard, Tray, Menu, nativeImage, nativeTheme } = require('electron');

// Force dark mode at Chromium level to eliminate white window brush
app.commandLine.appendSwitch('force-dark-mode');
const path = require('path');
const fs = require('fs');
const BinManager = require('./binManager');
const Downloader = require('./downloader');
const ConfigManager = require('./configManager');

// Prevent GPU disk cache lock errors on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

// Ensure single instance to prevent file lock conflicts
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

const appRoot = app.getAppPath ? app.getAppPath() : process.cwd();
const binManager = new BinManager(appRoot);
const downloader = new Downloader(binManager);
const configManager = new ConfigManager(appRoot);

// Set Windows Application User Model ID for clean Taskbar icon branding
app.setAppUserModelId('com.hypertube.speeddownloader');

function createWindow() {
  const iconIcoPath = path.join(__dirname, '..', 'renderer', 'assets', 'icon.ico');
  const iconPngPath = path.join(__dirname, '..', 'renderer', 'assets', 'icon.png');
  const iconPath = fs.existsSync(iconIcoPath) ? iconIcoPath : iconPngPath;
  const appIcon = nativeImage.createFromPath(iconPath);

  const isWindows = process.platform === 'win32';

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#08090d',
    darkTheme: true,
    title: 'HYPER TUBE - YouTube Speed Downloader',
    icon: appIcon,
    autoHideMenuBar: true,
    titleBarStyle: isWindows ? 'hidden' : 'default',
    titleBarOverlay: isWindows ? {
      color: '#08090d',
      symbolColor: '#f3f5f9',
      height: 34
    } : false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  });

  // Completely remove and hide the default File, Edit, View, Window menu (Zero white menu bar flicker)
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  if (mainWindow.setIcon && !appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    // 120ms presentation buffer ensures GPU DirectComposition has committed the dark frame before window reveals
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 120);
  });

  // Prevent app destroy when clicking "X" - minimize to system tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && tray.displayBalloon) {
        tray.displayBalloon({
          title: 'HYPER TUBE đang chạy ngầm',
          content: 'Ứng dụng đang tiếp tục tải ở tốc độ cao dưới khay hệ thống.'
        });
      }
    }
  });
}

function createTray() {
  try {
    const iconPngPath = path.join(__dirname, '..', 'renderer', 'assets', 'icon.png');
    const iconIcoPath = path.join(__dirname, '..', 'renderer', 'assets', 'icon.ico');
    let baseIcon = nativeImage.createFromPath(iconPngPath);
    if (baseIcon.isEmpty() && fs.existsSync(iconIcoPath)) {
      baseIcon = nativeImage.createFromPath(iconIcoPath);
    }
    // Resize to Windows System Tray standard 16x16
    const trayIcon = baseIcon.resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('HYPER TUBE - YouTube Speed Downloader');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Mở ứng dụng HYPER TUBE',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Thoát hoàn toàn',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('Không thể khởi tạo khay hệ thống:', err);
  }
}

// IPC Handlers
ipcMain.handle('config:get', async () => {
  return configManager.get();
});

ipcMain.handle('config:save', async (event, newConfig) => {
  return configManager.save(newConfig);
});

ipcMain.handle('engine:check', async () => {
  return await binManager.checkStatus();
});

ipcMain.handle('engine:install', async (event, name) => {
  if (name === 'ytdlp') {
    return await binManager.installYtDlp((prog) => {
      mainWindow?.webContents.send('engine:progress', { name: 'ytdlp', ...prog });
    });
  } else if (name === 'aria2c') {
    return await binManager.installAria2c((prog) => {
      mainWindow?.webContents.send('engine:progress', { name: 'aria2c', ...prog });
    });
  } else if (name === 'ffmpeg') {
    return await binManager.installFfmpeg((prog) => {
      mainWindow?.webContents.send('engine:progress', { name: 'ffmpeg', ...prog });
    });
  }
  throw new Error('Unknown engine name: ' + name);
});

ipcMain.handle('engine:update-ytdlp', async () => {
  return await binManager.updateYtDlp();
});

ipcMain.handle('video:get-info', async (event, url) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Vui lòng nhập đường dẫn video YouTube hợp lệ');
  }
  return await downloader.getVideoInfo(url.trim());
});

ipcMain.handle('video:start-download', async (event, options) => {
  const downloadId = options.id || `dl_${Date.now()}`;
  
  const onProgress = (data) => {
    mainWindow?.webContents.send('download:progress', data);
  };

  const onStatusChange = (data) => {
    mainWindow?.webContents.send('download:status', data);
  };

  return await downloader.startDownload(downloadId, options, onProgress, onStatusChange);
});

ipcMain.handle('video:cancel-download', async (event, id) => {
  return downloader.cancelDownload(id);
});

ipcMain.handle('dialog:select-directory', async (event, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: defaultPath || app.getPath('downloads'),
    title: 'Chọn thư mục lưu video tải xuống'
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('shell:open-file', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    return await shell.openPath(filePath);
  } else if (filePath) {
    const parentDir = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);
    if (fs.existsSync(parentDir)) {
      return await shell.openPath(parentDir);
    }
  }
});

ipcMain.handle('shell:open-folder', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  } else if (filePath) {
    const parentDir = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory() ? filePath : path.dirname(filePath);
    if (fs.existsSync(parentDir)) {
      return await shell.openPath(parentDir);
    }
  }
});

ipcMain.handle('clipboard:read', async () => {
  return clipboard.readText();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('app:restore-normal');
  }
});

app.whenReady().then(() => {
  if (nativeTheme) {
    nativeTheme.themeSource = 'dark';
  }
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep app active in system tray unless user explicitly selected 'Thoát hoàn toàn'
  if (isQuitting) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
