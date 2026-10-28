// =========================================================
// HYPER TUBE - APP LOGIC (Renderer Process)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const urlInput = document.getElementById('urlInput');
  const btnPaste = document.getElementById('btnPaste');
  const btnCheck = document.getElementById('btnCheck');
  const welcomeCard = document.getElementById('welcomeCard');
  const videoPreviewCard = document.getElementById('videoPreviewCard');
  const activeDownloadCard = document.getElementById('activeDownloadCard');

  // Video Info Elements
  const prevThumbnail = document.getElementById('prevThumbnail');
  const prevDuration = document.getElementById('prevDuration');
  const prevTitle = document.getElementById('prevTitle');
  const prevAuthor = document.getElementById('prevAuthor');
  const prevViews = document.getElementById('prevViews');
  const videoOptionsList = document.getElementById('videoOptionsList');
  const audioOptionsList = document.getElementById('audioOptionsList');
  const audioM4aSize = document.getElementById('audioM4aSize');

  // Progress Elements
  const dlVideoTitle = document.getElementById('dlVideoTitle');
  const dlStatusBadge = document.getElementById('dlStatusBadge');
  const dlSpeed = document.getElementById('dlSpeed');
  const dlThreads = document.getElementById('dlThreads');
  const dlProgressText = document.getElementById('dlProgressText');
  const dlSizeText = document.getElementById('dlSizeText');
  const dlEta = document.getElementById('dlEta');
  const dlPhase = document.getElementById('dlPhase');
  const dlProgressBar = document.getElementById('dlProgressBar');
  const dlStatusMsg = document.getElementById('dlStatusMsg');
  const dlActionButtons = document.getElementById('dlActionButtons');
  const btnOpenTargetFile = document.getElementById('btnOpenTargetFile');
  const btnOpenTargetFolder = document.getElementById('btnOpenTargetFolder');
  const btnCancelDownload = document.getElementById('btnCancelDownload');
  const btnStartDownload = document.getElementById('btnStartDownload');

  // Folder selection
  const downloadPathDisplay = document.getElementById('downloadPathDisplay');
  const btnChangeFolder = document.getElementById('btnChangeFolder');

  // Nav tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const selTabs = document.querySelectorAll('.sel-tab');

  // History & Settings
  const historyList = document.getElementById('historyList');
  const historyCount = document.getElementById('historyCount');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const settingConnections = document.getElementById('settingConnections');
  const settingContainer = document.getElementById('settingContainer');
  const settingChunkSize = document.getElementById('settingChunkSize');
  const settingFpsMode = document.getElementById('settingFpsMode');
  const btnUpdateYtdlp = document.getElementById('btnUpdateYtdlp');
  const engineDetailsGrid = document.getElementById('engineDetailsGrid');
  const updateLogBox = document.getElementById('updateLogBox');
  const updateLogText = document.getElementById('updateLogText');

  // Toast
  const appToast = document.getElementById('appToast');
  const toastMessage = document.getElementById('toastMessage');

  // Floating Sticky Mini Bar Elements
  const stickyMiniBar = document.getElementById('stickyMiniBar');
  const miniSpeed = document.getElementById('miniSpeed');
  const miniVideoTitle = document.getElementById('miniVideoTitle');
  const miniBarFill = document.getElementById('miniBarFill');
  const miniPercent = document.getElementById('miniPercent');
  const btnMiniView = document.getElementById('btnMiniView');

  // Batch Download Elements
  const batchBadge = document.getElementById('batchBadge');
  const batchUrlsInput = document.getElementById('batchUrlsInput');
  const batchDetectedCount = document.getElementById('batchDetectedCount');
  const batchQualitySelect = document.getElementById('batchQualitySelect');
  const btnBatchPasteClipboard = document.getElementById('btnBatchPasteClipboard');
  const btnBatchClearInput = document.getElementById('btnBatchClearInput');
  const btnStartBatch = document.getElementById('btnStartBatch');
  const btnPauseBatch = document.getElementById('btnPauseBatch');
  const btnPauseBatchText = document.getElementById('btnPauseBatchText');
  const btnClearBatch = document.getElementById('btnClearBatch');
  const batchMonitorCard = document.getElementById('batchMonitorCard');
  const bmProgressText = document.getElementById('bmProgressText');
  const bmSpeed = document.getElementById('bmSpeed');
  const bmOverallFill = document.getElementById('bmOverallFill');
  const batchQueueList = document.getElementById('batchQueueList');

  // State
  let currentVideoInfo = null;
  let currentDownloadId = null;
  let activeCompletedFilePath = null;
  let activeCompletedDirPath = null;
  let downloadMode = 'video'; // 'video' | 'audio'
  let savedDownloadPath = '';
  let appConfig = {};
  let isDownloading = false;
  let currentTab = 'tab-download';

  // Batch Queue State
  let batchQueue = [];
  let isBatchRunning = false;
  let isBatchPaused = false;
  let currentBatchDownloadId = null;

  // Initialize
  initApp();

  async function initApp() {
    setupTabNavigation();
    await loadAppConfig();
    setupSettings();
    setupBatchEvents();
    setupCustomDropdowns();

    // Lightweight badge count only, lazy-load DOM when user clicks tab
    const list = getHistory();
    if (historyCount) historyCount.textContent = list.length;

    // Auto-paste if clipboard has YouTube link on launch
    checkClipboardAutoPaste();
  }

  // Load configuration from config.json
  async function loadAppConfig() {
    try {
      appConfig = await window.api.getConfig();
      savedDownloadPath = appConfig.downloadDir || '';

      if (savedDownloadPath) {
        downloadPathDisplay.textContent = savedDownloadPath;
      } else {
        downloadPathDisplay.textContent = 'Mặc định (Thư mục Downloads)';
      }

      if (settingConnections && appConfig.connections) {
        settingConnections.value = appConfig.connections;
      }
      if (settingContainer && appConfig.container) {
        settingContainer.value = appConfig.container;
      }
      if (settingChunkSize && appConfig.chunkSize) {
        settingChunkSize.value = appConfig.chunkSize;
      }
      if (settingFpsMode && appConfig.fpsMode) {
        settingFpsMode.value = appConfig.fpsMode;
      }
      if (batchQualitySelect && appConfig.batchQuality) {
        batchQualitySelect.value = appConfig.batchQuality;
      }

      // Sync custom dropdown displays
      syncAllCustomDropdowns();
    } catch (err) {
      console.error('Không thể đọc config:', err);
    }
  }

  // Check Engine status (Cached for instant 0ms tab switching)
  let cachedEngineStatus = null;
  async function checkEngineStatus(forceRefresh = false) {
    if (cachedEngineStatus && !forceRefresh) {
      renderEngineDetails(cachedEngineStatus);
      return;
    }
    try {
      cachedEngineStatus = await window.api.checkBinaries();
      renderEngineDetails(cachedEngineStatus);
    } catch (err) {
      console.error('Lỗi kiểm tra engine:', err);
    }
  }

  function renderEngineDetails(status) {
    if (!engineDetailsGrid) return;

    const formatDisplayPath = (fullPath) => {
      if (!fullPath) return 'Chưa tìm thấy file';
      const normalized = fullPath.replace(/\\/g, '/');
      if (normalized.includes('/bin/')) {
        return './bin/' + normalized.split('/bin/').pop();
      }
      // For ffmpeg, show shortened clean label
      if (normalized.includes('ffmpeg')) {
        const parts = fullPath.split('\\');
        return '...\\' + parts.slice(-2).join('\\');
      }
      return fullPath;
    };

    engineDetailsGrid.innerHTML = `
      <div class="engine-detail-box" title="Đường dẫn đầy đủ: ${status.ytdlp.path || ''}">
        <div class="ed-header">
          <div class="ed-title-group">
            <span class="status-dot ${status.ytdlp.exists ? 'active' : ''}"></span>
            <span class="ed-name">yt-dlp Core</span>
          </div>
          <span class="ed-val">${status.ytdlp.version || 'Chưa cài đặt'}</span>
        </div>
        <div class="ed-path-row">
          <span class="ed-path-label">Vị trí:</span>
          <span class="ed-path" title="${status.ytdlp.path || ''}">${formatDisplayPath(status.ytdlp.path)}</span>
        </div>
      </div>
      <div class="engine-detail-box" title="Đường dẫn đầy đủ: ${status.aria2c.path || ''}">
        <div class="ed-header">
          <div class="ed-title-group">
            <span class="status-dot ${status.aria2c.exists ? 'active' : ''}"></span>
            <span class="ed-name">aria2c Accelerator</span>
          </div>
          <span class="ed-val">${status.aria2c.version ? '16x Luồng (v1.37)' : 'Chưa cài đặt'}</span>
        </div>
        <div class="ed-path-row">
          <span class="ed-path-label">Vị trí:</span>
          <span class="ed-path" title="${status.aria2c.path || ''}">${formatDisplayPath(status.aria2c.path)}</span>
        </div>
      </div>
      <div class="engine-detail-box" title="Đường dẫn đầy đủ: ${status.ffmpeg.path || ''}">
        <div class="ed-header">
          <div class="ed-title-group">
            <span class="status-dot ${status.ffmpeg.exists ? 'active' : ''}"></span>
            <span class="ed-name">FFmpeg Muxer</span>
          </div>
          <span class="ed-val">${status.ffmpeg.exists ? 'v8.1 (Stream Copy)' : 'Chưa cài đặt'}</span>
        </div>
        <div class="ed-path-row">
          <span class="ed-path-label">Vị trí:</span>
          <span class="ed-path" title="${status.ffmpeg.path || ''}">${formatDisplayPath(status.ffmpeg.path)}</span>
        </div>
      </div>
    `;
  }

  // Clipboard Paste Helper
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await window.api.readClipboard();
      if (text && (text.includes('youtube.com') || text.includes('youtu.be'))) {
        urlInput.value = text.trim();
        showToast('Đã dán link từ Clipboard!', 'success');
        triggerVideoCheck();
      } else {
        showToast('Clipboard không chứa đường dẫn YouTube hợp lệ.', 'error');
      }
    } catch (e) {
      showToast('Không thể đọc Clipboard', 'error');
    }
  });

  async function checkClipboardAutoPaste() {
    try {
      const text = await window.api.readClipboard();
      if (text && (text.includes('youtube.com/watch') || text.includes('youtu.be/')) && !urlInput.value) {
        urlInput.value = text.trim();
      }
    } catch (e) {}
  }

  // Trigger Video Check
  btnCheck.addEventListener('click', () => triggerVideoCheck());
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerVideoCheck();
  });

  async function triggerVideoCheck() {
    const url = urlInput.value.trim();
    if (!url) {
      showToast('Vui lòng nhập đường dẫn video YouTube!', 'error');
      urlInput.focus();
      return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      showToast('Đường dẫn không phải là link YouTube hợp lệ.', 'error');
      return;
    }

    btnCheck.classList.add('loading');
    btnCheck.disabled = true;

    try {
      const info = await window.api.getVideoInfo(url);
      currentVideoInfo = info;
      renderVideoPreview(info);
      showToast('Đã lấy thông tin và phân tích chất lượng thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Không thể lấy thông tin video. Hãy thử lại.', 'error');
    } finally {
      btnCheck.classList.remove('loading');
      btnCheck.disabled = false;
    }
  }

  // Render Video Preview & Formats
  function renderVideoPreview(info) {
    welcomeCard.classList.add('hidden');
    videoPreviewCard.classList.remove('hidden');

    prevThumbnail.src = info.thumbnail;
    prevDuration.textContent = info.durationStr;
    prevTitle.textContent = info.title;
    prevAuthor.textContent = info.uploader;
    prevViews.textContent = `${info.viewCount} lượt xem`;

    if (info.bestAudioSizeStr) {
      audioM4aSize.textContent = `~ ${info.bestAudioSizeStr}`;
    }

    // Populate Video Formats
    videoOptionsList.innerHTML = '';

    // Filter options based on user's FPS preference from config.json
    const fpsMode = (settingFpsMode ? settingFpsMode.value : '') || appConfig.fpsMode || 'all';
    let optionsToDisplay = info.videoOptions || [];

    if (fpsMode === 'prefer60') {
      const has60Heights = new Set(info.videoOptions.filter(o => o.is60).map(o => o.height));
      optionsToDisplay = info.videoOptions.filter(o => !has60Heights.has(o.height) || o.is60);
    } else if (fpsMode === 'prefer30') {
      const has30Heights = new Set(info.videoOptions.filter(o => !o.is60).map(o => o.height));
      optionsToDisplay = info.videoOptions.filter(o => !has30Heights.has(o.height) || !o.is60);
    }

    if (optionsToDisplay.length === 0) {
      videoOptionsList.innerHTML = `<div class="empty-state">Không tìm thấy định dạng video phù hợp.</div>`;
      return;
    }

    optionsToDisplay.forEach((opt, idx) => {
      const label = document.createElement('label');
      label.className = `option-card ${idx === 0 ? 'active' : ''}`;

      const isLargeTag = opt.isLarge ? `<span class="badge-large">⚡ >1 GB (${opt.estimatedSizeStr})</span>` : '';
      const fpsTag = opt.fps >= 50 
        ? `<span class="badge-fps">${opt.fps}fps</span>` 
        : `<span class="badge-codec">30fps</span>`;
      const codecTag = opt.codec ? `<span class="badge-codec">${opt.codec.toUpperCase()}</span>` : '';

      label.innerHTML = `
        <input type="radio" name="videoFormat" value="${opt.formatId}" data-height="${opt.height}" ${idx === 0 ? 'checked' : ''} />
        <div class="opt-body">
          <div class="opt-main">
            <span class="opt-res">${opt.label}</span>
            <span class="badge-res">${opt.height}p</span>
            ${fpsTag}
            ${codecTag}
            ${isLargeTag}
          </div>
          <span class="opt-size">${opt.estimatedSizeStr}</span>
        </div>
      `;

      label.addEventListener('click', () => {
        document.querySelectorAll('#videoOptionsList .option-card').forEach(c => c.classList.remove('active'));
        label.classList.add('active');
      });

      videoOptionsList.appendChild(label);
    });

    // Scroll smoothly to preview
    videoPreviewCard.scrollIntoView({ behavior: 'smooth' });
  }

  // Switch between Video and Audio Tabs
  selTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      downloadMode = tab.dataset.mode;

      if (downloadMode === 'video') {
        videoOptionsList.classList.remove('hidden');
        audioOptionsList.classList.add('hidden');
      } else {
        videoOptionsList.classList.add('hidden');
        audioOptionsList.classList.remove('hidden');
      }
    });
  });

  // Audio format card click
  document.querySelectorAll('#audioOptionsList .option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#audioOptionsList .option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // Folder change (Saved to config.json)
  btnChangeFolder.addEventListener('click', async () => {
    try {
      const selectedDir = await window.api.selectDirectory(savedDownloadPath);
      if (selectedDir) {
        savedDownloadPath = selectedDir;
        downloadPathDisplay.textContent = savedDownloadPath;
        await window.api.saveConfig({ downloadDir: savedDownloadPath });
        showToast('Đã lưu thư mục tải vào config.json!', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  });

  // START ACCELERATED DOWNLOAD
  btnStartDownload.addEventListener('click', async () => {
    if (!currentVideoInfo) return;

    const connections = parseInt(settingConnections.value, 10) || 16;
    const container = settingContainer.value || 'mp4';
    const chunkSize = settingChunkSize.value || '10M';

    let selectedFormatId = 'bestvideo+bestaudio/best';
    let audioFormat = 'mp3';
    let isAudioOnly = (downloadMode === 'audio');

    if (isAudioOnly) {
      const selectedAudioRadio = document.querySelector('input[name="audioFormat"]:checked');
      audioFormat = selectedAudioRadio ? selectedAudioRadio.value : 'mp3';
    } else {
      const selectedVideoRadio = document.querySelector('input[name="videoFormat"]:checked');
      if (selectedVideoRadio) {
        selectedFormatId = selectedVideoRadio.value;
      }
    }

    currentDownloadId = `dl_${Date.now()}`;
    isDownloading = true;

    // Update mini bar
    if (miniVideoTitle) miniVideoTitle.textContent = currentVideoInfo.title;
    if (miniSpeed) miniSpeed.textContent = '0.0 MB/s';
    if (miniPercent) miniPercent.textContent = '0%';
    if (miniBarFill) miniBarFill.style.width = '0%';
    if (currentTab !== 'tab-download') {
      stickyMiniBar?.classList.remove('hidden');
    }

    // Reset and show progress card
    activeDownloadCard.classList.remove('hidden');
    dlVideoTitle.textContent = currentVideoInfo.title;
    dlStatusBadge.textContent = 'ĐANG TẢI ĐA LUỒNG';
    dlSpeed.textContent = '0.0 MB/s';
    dlThreads.textContent = `${connections} Luồng`;
    dlProgressText.textContent = '0%';
    dlSizeText.textContent = 'Đang khởi tạo kết nối...';
    dlEta.textContent = '--:--';
    dlPhase.textContent = isAudioOnly ? 'Audio Extract' : 'aria2c Multi-chunk';
    dlProgressBar.style.width = '0%';
    dlStatusMsg.textContent = 'Đang mở các luồng kết nối tới CDN...';
    dlActionButtons.classList.add('hidden');
    btnCancelDownload.classList.remove('hidden');
    btnStartDownload.disabled = true;

    activeDownloadCard.scrollIntoView({ behavior: 'smooth' });

    try {
      const downloadOptions = {
        id: currentDownloadId,
        url: currentVideoInfo.webpageUrl,
        formatId: selectedFormatId,
        isAudioOnly: isAudioOnly,
        audioFormat: audioFormat,
        container: container,
        connections: connections,
        chunkSize: chunkSize,
        downloadDir: savedDownloadPath || undefined
      };

      const result = await window.api.startDownload(downloadOptions);
      if (result && result.success) {
        activeCompletedFilePath = result.filePath;
        activeCompletedDirPath = savedDownloadPath;

        // Save to history
        saveToHistory({
          id: currentVideoInfo.id,
          title: currentVideoInfo.title,
          thumbnail: currentVideoInfo.thumbnail,
          quality: isAudioOnly ? audioFormat.toUpperCase() : 'Video MP4',
          filePath: result.filePath,
          date: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        });
      }
    } catch (err) {
      if (err.message && err.message.includes('kết thúc với mã lỗi')) {
        dlStatusMsg.textContent = 'Tiến trình tải đã dừng hoặc xảy ra lỗi.';
      } else {
        showToast(err.message || 'Lỗi khi tải video', 'error');
      }
    } finally {
      isDownloading = false;
      stickyMiniBar?.classList.add('hidden');
      btnStartDownload.disabled = false;
    }
  });

  // Cancel Download
  btnCancelDownload.addEventListener('click', async () => {
    if (currentDownloadId) {
      await window.api.cancelDownload(currentDownloadId);
      isDownloading = false;
      stickyMiniBar?.classList.add('hidden');
      dlStatusBadge.textContent = 'ĐÃ HỦY';
      dlStatusMsg.textContent = 'Bạn đã hủy tiến trình tải này.';
      btnCancelDownload.classList.add('hidden');
      btnStartDownload.disabled = false;
      showToast('Đã dừng tiến trình tải.', 'error');
    }
  });

  // Open file & folder handlers
  btnOpenTargetFile.addEventListener('click', () => {
    if (activeCompletedFilePath) window.api.openFile(activeCompletedFilePath);
  });
  btnOpenTargetFolder.addEventListener('click', () => {
    if (activeCompletedFilePath) window.api.openFolder(activeCompletedFilePath);
  });

  // Real-time Download Progress Listener
  window.api.onDownloadProgress((data) => {
    if (currentBatchDownloadId && data.id === currentBatchDownloadId) {
      handleBatchProgress(data);
      return;
    }
    if (data.id !== currentDownloadId) return;

    if (data.percent !== undefined) {
      dlProgressBar.style.width = `${data.percent}%`;
      dlProgressText.textContent = `${data.percent}%`;
      if (miniPercent) miniPercent.textContent = `${data.percent}%`;
      if (miniBarFill) miniBarFill.style.width = `${data.percent}%`;
    }

    if (data.stageTitle) {
      dlPhase.textContent = data.stageTitle;
    }

    if (data.stage) {
      if (data.stage === 'video') {
        dlStatusBadge.textContent = 'ĐANG TẢI VIDEO (85%)';
      } else if (data.stage === 'audio') {
        dlStatusBadge.textContent = 'ĐANG TẢI AUDIO (10%)';
      } else if (data.stage === 'merging') {
        dlStatusBadge.textContent = 'ĐANG GHÉP LUỒNG (FFMPEG)';
      }
    }

    if (data.speed) {
      dlSpeed.textContent = data.speed;
      if (miniSpeed) miniSpeed.textContent = data.speed;
    }

    if (data.downloaded && data.total) {
      dlSizeText.textContent = `${data.downloaded} / ${data.total}`;
    } else if (data.total) {
      dlSizeText.textContent = `Tổng: ~${data.total}`;
    }

    if (data.eta) {
      dlEta.textContent = data.eta;
    }
  });

  // Real-time Download Status Listener
  window.api.onDownloadStatus((data) => {
    if (currentBatchDownloadId && data.id === currentBatchDownloadId) {
      handleBatchStatus(data);
      return;
    }
    if (data.id !== currentDownloadId) return;

    if (data.message) {
      dlStatusMsg.textContent = data.message;
    }

    if (data.status === 'merging') {
      dlStatusBadge.textContent = 'ĐANG GHÉP LUỒNG (FFMPEG)';
      const p = data.percent || 96;
      dlProgressBar.style.width = `${p}%`;
      dlProgressText.textContent = `${p}%`;
      dlPhase.textContent = 'Đóng gói MP4 không nén';
      dlSpeed.textContent = 'GHÉP FILE';
      if (miniSpeed) miniSpeed.textContent = 'GHÉP FILE';
      if (miniPercent) miniPercent.textContent = `${p}%`;
      if (miniBarFill) miniBarFill.style.width = `${p}%`;
    } else if (data.status === 'completed') {
      isDownloading = false;
      stickyMiniBar?.classList.add('hidden');
      dlStatusBadge.textContent = 'HOÀN TẤT 100%';
      dlProgressBar.style.width = '100%';
      dlProgressText.textContent = '100%';
      if (miniPercent) miniPercent.textContent = '100%';
      if (miniBarFill) miniBarFill.style.width = '100%';
      dlSpeed.textContent = 'Xong!';
      dlEta.textContent = '00:00';
      dlPhase.textContent = 'Sẵn sàng mở file';
      btnCancelDownload.classList.add('hidden');
      dlActionButtons.classList.remove('hidden');
      showToast('🎉 Tải và ghép video thành công!', 'success');
    } else if (data.status === 'error') {
      isDownloading = false;
      stickyMiniBar?.classList.add('hidden');
      dlStatusBadge.textContent = 'LỖI TẢI';
      btnCancelDownload.classList.add('hidden');
    }
  });

  // Tab Navigation Handling
  function setupTabNavigation() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        currentTab = targetTab;

        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const targetEl = document.getElementById(targetTab);
        if (targetEl) targetEl.classList.add('active');

        if (targetTab === 'tab-history') {
          renderHistory();
        } else if (targetTab === 'tab-settings') {
          checkEngineStatus();
        }

        // Show/hide floating sticky mini bar
        if (isDownloading && currentTab !== 'tab-download') {
          stickyMiniBar?.classList.remove('hidden');
        } else {
          stickyMiniBar?.classList.add('hidden');
        }
      });
    });

    btnMiniView?.addEventListener('click', () => {
      switchToDownloadTab();
    });

    stickyMiniBar?.addEventListener('click', (e) => {
      if (e.target !== btnMiniView && !btnMiniView?.contains(e.target)) {
        switchToDownloadTab();
      }
    });
  }

  function switchToDownloadTab() {
    currentTab = 'tab-download';
    navTabs.forEach(t => {
      if (t.dataset.tab === 'tab-download') t.classList.add('active');
      else t.classList.remove('active');
    });
    tabContents.forEach(c => {
      if (c.id === 'tab-download') c.classList.add('active');
      else c.classList.remove('active');
    });
    stickyMiniBar?.classList.add('hidden');
    activeDownloadCard.scrollIntoView({ behavior: 'smooth' });
  }

  // History Management
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('hypertube_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveToHistory(item) {
    const list = getHistory();
    list.unshift(item); // add to top
    if (list.length > 50) list.pop(); // keep last 50
    localStorage.setItem('hypertube_history', JSON.stringify(list));
    renderHistory();
  }

  function renderHistory() {
    const list = getHistory();
    historyCount.textContent = list.length;

    if (!historyList) return;

    if (list.length === 0) {
      historyList.innerHTML = `<div class="empty-state"><p>Chưa có video nào trong lịch sử.</p></div>`;
      return;
    }

    historyList.innerHTML = '';
    list.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <img class="hist-thumb" src="${item.thumbnail || ''}" alt="thumb" onerror="this.style.display='none'" />
        <div class="hist-details">
          <div class="hist-title" title="${item.title}">${item.title}</div>
          <div class="hist-meta">
            <span>${item.quality}</span>
            <span>•</span>
            <span>${item.date}</span>
          </div>
        </div>
        <div class="hist-actions">
          <button class="btn-action secondary btn-hist-play">Phát</button>
          <button class="btn-action secondary btn-hist-folder">Mở thư mục</button>
        </div>
      `;
      div.querySelector('.btn-hist-play')?.addEventListener('click', () => {
        if (item.filePath) window.api.openFile(item.filePath);
      });
      div.querySelector('.btn-hist-folder')?.addEventListener('click', () => {
        if (item.filePath) window.api.openFolder(item.filePath);
      });
      historyList.appendChild(div);
    });
  }

  btnClearHistory?.addEventListener('click', () => {
    localStorage.removeItem('hypertube_history');
    renderHistory();
    showToast('Đã xóa toàn bộ lịch sử tải.', 'success');
  });

  // Settings Handling
  function setupSettings() {
    settingConnections?.addEventListener('change', async () => {
      const val = parseInt(settingConnections.value, 10) || 16;
      await window.api.saveConfig({ connections: val });
      showToast('Đã lưu số luồng vào config.json!', 'success');
    });

    settingContainer?.addEventListener('change', async () => {
      await window.api.saveConfig({ container: settingContainer.value });
      showToast('Đã lưu định dạng xuất vào config.json!', 'success');
    });

    settingChunkSize?.addEventListener('change', async () => {
      await window.api.saveConfig({ chunkSize: settingChunkSize.value });
      showToast('Đã lưu kích thước chunk vào config.json!', 'success');
    });

    settingFpsMode?.addEventListener('change', async () => {
      await window.api.saveConfig({ fpsMode: settingFpsMode.value });
      showToast('Đã lưu chế độ FPS vào config.json!', 'success');
      if (currentVideoInfo) {
        renderVideoPreview(currentVideoInfo);
      }
    });

    btnUpdateYtdlp?.addEventListener('click', async () => {
      btnUpdateYtdlp.disabled = true;
      updateLogBox.classList.remove('hidden');
      updateLogText.textContent = 'Đang kết nối tới máy chủ GitHub để cập nhật yt-dlp...';

      try {
        const res = await window.api.updateYtDlp();
        updateLogText.textContent = res.output || 'Đã kiểm tra xong phiên bản mới nhất.';
        showToast('Hoàn tất kiểm tra cập nhật yt-dlp!', 'success');
        await checkEngineStatus(true);
      } catch (err) {
        updateLogText.textContent = 'Lỗi cập nhật: ' + err.message;
        showToast('Lỗi khi cập nhật yt-dlp', 'error');
      } finally {
        btnUpdateYtdlp.disabled = false;
      }
    });
  }

  // =========================================================
  // BATCH DOWNLOAD QUEUE MANAGER
  // =========================================================

  function setupBatchEvents() {
    batchUrlsInput?.addEventListener('input', () => {
      const urls = extractYouTubeUrls(batchUrlsInput.value);
      if (batchDetectedCount) {
        batchDetectedCount.textContent = `Đã nhận diện: ${urls.length} liên kết hợp lệ`;
      }
    });

    btnBatchPasteClipboard?.addEventListener('click', async () => {
      try {
        const text = await window.api.readClipboard();
        if (text) {
          const currentVal = batchUrlsInput.value ? (batchUrlsInput.value + '\n') : '';
          batchUrlsInput.value = currentVal + text;
          const urls = extractYouTubeUrls(batchUrlsInput.value);
          if (batchDetectedCount) {
            batchDetectedCount.textContent = `Đã nhận diện: ${urls.length} liên kết hợp lệ`;
          }
          showToast('Đã dán nội dung từ Clipboard!', 'success');
        } else {
          showToast('Clipboard không có nội dung văn bản.', 'error');
        }
      } catch (e) {
        showToast('Không thể đọc Clipboard.', 'error');
      }
    });

    btnBatchClearInput?.addEventListener('click', () => {
      if (batchUrlsInput) batchUrlsInput.value = '';
      if (batchDetectedCount) batchDetectedCount.textContent = 'Đã nhận diện: 0 liên kết hợp lệ';
    });

    btnStartBatch?.addEventListener('click', () => {
      startBatchQueue();
    });

    btnPauseBatch?.addEventListener('click', () => {
      pauseBatchQueue();
    });

    btnClearBatch?.addEventListener('click', () => {
      clearBatchQueue();
    });

    batchQualitySelect?.addEventListener('change', async () => {
      await window.api.saveConfig({ batchQuality: batchQualitySelect.value });
      showToast('Đã lưu chất lượng tải hàng loạt vào config.json!', 'success');
    });
  }

  function extractYouTubeUrls(text) {
    if (!text || typeof text !== 'string') return [];
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    const urls = [];
    const seen = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
      const fullUrl = `https://www.youtube.com/watch?v=${match[1]}`;
      if (!seen.has(fullUrl)) {
        seen.add(fullUrl);
        urls.push(fullUrl);
      }
    }
    return urls;
  }

  function addUrlsToBatch(urls, quality) {
    urls.forEach(url => {
      const exists = batchQueue.some(i => i.url === url && i.status === 'waiting');
      if (!exists) {
        const videoIdMatch = url.match(/[?&]v=([^&#]+)/) || url.match(/youtu\.be\/([^?&#]+)/) || url.match(/shorts\/([^?&#]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';
        batchQueue.push({
          id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          title: videoId ? `Video YouTube [${videoId}]` : url,
          quality: quality || 'best',
          status: 'waiting',
          percent: 0,
          speed: '',
          eta: '',
          stageTitle: 'Đang xếp hàng chờ...',
          filePath: null,
          errorMsg: null
        });
      }
    });

    renderBatchQueue();
    showToast(`Đã thêm ${urls.length} video vào hàng chờ!`, 'success');
  }

  function renderBatchQueue() {
    if (!batchQueueList) return;
    if (!batchQueue.length) {
      batchQueueList.innerHTML = `<div class="empty-state"><p>Chưa có liên kết nào trong hàng đợi.</p></div>`;
      if (batchMonitorCard) batchMonitorCard.classList.add('hidden');
      if (btnPauseBatch) btnPauseBatch.classList.add('hidden');
      if (btnClearBatch) btnClearBatch.classList.add('hidden');
      if (batchBadge) batchBadge.textContent = '0';
      return;
    }

    if (batchMonitorCard) batchMonitorCard.classList.remove('hidden');
    if (btnPauseBatch) btnPauseBatch.classList.remove('hidden');
    if (btnClearBatch) btnClearBatch.classList.remove('hidden');

    const waitingOrActive = batchQueue.filter(i => i.status === 'waiting' || i.status === 'downloading').length;
    if (batchBadge) batchBadge.textContent = waitingOrActive;

    batchQueueList.innerHTML = '';
    batchQueue.forEach((item, index) => {
      item.index = index + 1;
      const el = createBatchItemElement(item);
      batchQueueList.appendChild(el);
    });

    updateOverallBatchProgress();
  }

  function createBatchItemElement(item) {
    const div = document.createElement('div');
    div.className = `batch-queue-item ${item.status === 'downloading' ? 'active' : ''}`;
    div.id = `bqi_${item.id}`;

    let badgeClass = 'badge-waiting';
    let badgeText = '⏳ Đang chờ';
    if (item.status === 'downloading') {
      badgeClass = 'badge-downloading';
      badgeText = `⚡ Đang tải (${item.percent || 0}%)`;
    } else if (item.status === 'completed') {
      badgeClass = 'badge-completed';
      badgeText = '✅ Hoàn tất';
    } else if (item.status === 'error') {
      badgeClass = 'badge-error';
      badgeText = '❌ Lỗi';
    }

    const qualityLabel = item.quality === 'audio' ? 'Audio MP3' : item.quality.toUpperCase();

    div.innerHTML = `
      <div class="bqi-top-row">
        <div class="bqi-title-box">
          <span class="bqi-index">#${item.index}</span>
          <span class="bqi-title" title="${item.url}">${item.title}</span>
        </div>
        <div class="bqi-actions">
          <span class="bqi-status-badge ${badgeClass}" id="bqi_badge_${item.id}">${badgeText}</span>
          ${item.status === 'waiting' ? `<button class="btn-bqi-delete" data-id="${item.id}" title="Xóa khỏi hàng đợi">✕</button>` : ''}
        </div>
      </div>
      <div class="bqi-progress-bar ${item.status === 'downloading' ? '' : 'hidden'}" id="bqi_prog_wrap_${item.id}">
        <div class="bqi-progress-fill" id="bqi_prog_${item.id}" style="width: ${item.percent || 0}%"></div>
      </div>
      <div class="bqi-bottom-row">
        <span class="bqi-stage" id="bqi_stage_${item.id}">${item.stageTitle || (item.status === 'waiting' ? 'Đang xếp hàng chờ...' : '')}</span>
        <span class="bqi-quality">${qualityLabel} ${item.speed && item.status === 'downloading' ? `• ${item.speed}` : ''}</span>
      </div>
    `;

    const delBtn = div.querySelector('.btn-bqi-delete');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        removeBatchItem(item.id);
      });
    }

    return div;
  }

  function updateBatchItemDOM(item) {
    const el = document.getElementById(`bqi_${item.id}`);
    if (!el) return;

    if (item.status === 'downloading') {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }

    const badge = document.getElementById(`bqi_badge_${item.id}`);
    if (badge) {
      let badgeClass = 'badge-waiting';
      let badgeText = '⏳ Đang chờ';
      if (item.status === 'downloading') {
        badgeClass = 'badge-downloading';
        badgeText = `⚡ Đang tải (${item.percent || 0}%)`;
      } else if (item.status === 'completed') {
        badgeClass = 'badge-completed';
        badgeText = '✅ Hoàn tất';
      } else if (item.status === 'error') {
        badgeClass = 'badge-error';
        badgeText = '❌ Lỗi';
      }
      badge.className = `bqi-status-badge ${badgeClass}`;
      badge.textContent = badgeText;
    }

    const progWrap = document.getElementById(`bqi_prog_wrap_${item.id}`);
    const progFill = document.getElementById(`bqi_prog_${item.id}`);
    if (progWrap && progFill) {
      if (item.status === 'downloading') {
        progWrap.classList.remove('hidden');
        progFill.style.width = `${item.percent || 0}%`;
      } else {
        progWrap.classList.add('hidden');
      }
    }

    const stageEl = document.getElementById(`bqi_stage_${item.id}`);
    if (stageEl) {
      stageEl.textContent = item.stageTitle || '';
    }

    const waitingOrActive = batchQueue.filter(i => i.status === 'waiting' || i.status === 'downloading').length;
    if (batchBadge) batchBadge.textContent = waitingOrActive;
  }

  function updateOverallBatchProgress() {
    if (!batchQueue.length) {
      if (bmProgressText) bmProgressText.textContent = '0 / 0 hoàn tất';
      if (bmOverallFill) bmOverallFill.style.width = '0%';
      return;
    }

    const total = batchQueue.length;
    const completed = batchQueue.filter(i => i.status === 'completed').length;
    const errors = batchQueue.filter(i => i.status === 'error').length;

    let totalPercentSum = 0;
    batchQueue.forEach(i => {
      totalPercentSum += (i.percent || 0);
    });
    const avgPercent = Math.round(totalPercentSum / total);

    if (bmProgressText) {
      bmProgressText.textContent = `${completed + errors} / ${total} hoàn tất (${completed} thành công${errors ? `, ${errors} lỗi` : ''})`;
    }
    if (bmOverallFill) {
      bmOverallFill.style.width = `${avgPercent}%`;
    }
  }

  async function startBatchQueue() {
    const text = batchUrlsInput?.value.trim();
    if (text) {
      const urls = extractYouTubeUrls(text);
      if (urls.length > 0) {
        addUrlsToBatch(urls, batchQualitySelect.value);
        batchUrlsInput.value = '';
        if (batchDetectedCount) batchDetectedCount.textContent = 'Đã nhận diện: 0 liên kết hợp lệ';
      }
    }

    if (!batchQueue.length) {
      showToast('Vui lòng dán ít nhất 1 liên kết YouTube vào khung nhập liệu.', 'error');
      batchUrlsInput?.focus();
      return;
    }

    const hasWaiting = batchQueue.some(i => i.status === 'waiting');
    if (!hasWaiting) {
      showToast('Tất cả video trong hàng đợi đã hoàn thành hoặc lỗi. Hãy thêm video mới.', 'info');
      return;
    }

    isBatchRunning = true;
    isBatchPaused = false;
    btnStartBatch.disabled = true;
    btnStartBatch.classList.add('loading');
    if (btnPauseBatchText) btnPauseBatchText.textContent = 'TẠM DỪNG';

    showToast('🚀 Đang bắt đầu xử lý hàng đợi tải hàng loạt...', 'success');
    processNextBatchItem();
  }

  async function processNextBatchItem() {
    if (!isBatchRunning || isBatchPaused) return;

    const nextItem = batchQueue.find(i => i.status === 'waiting');
    if (!nextItem) {
      isBatchRunning = false;
      btnStartBatch.disabled = false;
      btnStartBatch.classList.remove('loading');
      if (btnPauseBatch) btnPauseBatch.classList.add('hidden');
      const successful = batchQueue.filter(i => i.status === 'completed').length;
      showToast(`🎉 Đã hoàn tất toàn bộ hàng đợi! (${successful}/${batchQueue.length} video thành công)`, 'success');
      return;
    }

    nextItem.status = 'downloading';
    nextItem.percent = 0;
    nextItem.stageTitle = 'Đang khởi động tải...';
    currentBatchDownloadId = nextItem.id;

    updateBatchItemDOM(nextItem);
    updateOverallBatchProgress();

    const itemEl = document.getElementById(`bqi_${nextItem.id}`);
    itemEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      const options = {
        id: nextItem.id,
        url: nextItem.url,
        downloadDir: savedDownloadPath || appConfig.downloadDir,
        connections: appConfig.connections || 16,
        container: appConfig.container || 'mp4',
        isAudioOnly: nextItem.quality === 'audio',
        audioFormat: 'mp3',
        formatId: nextItem.quality === '1080p'
          ? 'bestvideo[height<=1080]+bestaudio/best'
          : nextItem.quality === '720p'
          ? 'bestvideo[height<=720]+bestaudio/best'
          : 'bestvideo+bestaudio/best'
      };

      await window.api.startDownload(options);
    } catch (err) {
      console.error(`Lỗi tải video batch ${nextItem.id}:`, err);
    }
  }

  function pauseBatchQueue() {
    if (!isBatchRunning) return;

    if (!isBatchPaused) {
      isBatchPaused = true;
      if (btnPauseBatchText) btnPauseBatchText.textContent = 'TIẾP TỤC';
      showToast('Đã tạm dừng hàng đợi. Video đang tải sẽ tiếp tục cho đến khi xong, sau đó tạm nghỉ.', 'info');
    } else {
      isBatchPaused = false;
      if (btnPauseBatchText) btnPauseBatchText.textContent = 'TẠM DỪNG';
      showToast('Tiếp tục hàng đợi tải hàng loạt...', 'success');
      if (!currentBatchDownloadId) {
        processNextBatchItem();
      }
    }
  }

  function clearBatchQueue() {
    if (currentBatchDownloadId) {
      window.api.cancelDownload(currentBatchDownloadId);
      currentBatchDownloadId = null;
    }
    batchQueue = [];
    isBatchRunning = false;
    isBatchPaused = false;
    btnStartBatch.disabled = false;
    btnStartBatch.classList.remove('loading');
    renderBatchQueue();
    showToast('Đã xóa sạch hàng đợi tải.', 'info');
  }

  function removeBatchItem(id) {
    const idx = batchQueue.findIndex(i => i.id === id);
    if (idx === -1) return;

    if (batchQueue[idx].status === 'downloading') {
      window.api.cancelDownload(id);
      currentBatchDownloadId = null;
      batchQueue.splice(idx, 1);
      renderBatchQueue();
      if (isBatchRunning && !isBatchPaused) {
        processNextBatchItem();
      }
    } else {
      batchQueue.splice(idx, 1);
      renderBatchQueue();
    }
  }

  function handleBatchProgress(data) {
    const item = batchQueue.find(i => i.id === data.id);
    if (!item) return;

    if (data.percent !== undefined) {
      item.percent = data.percent;
    }
    if (data.speed) {
      item.speed = data.speed;
      if (bmSpeed) bmSpeed.textContent = data.speed;
    }
    if (data.eta) {
      item.eta = data.eta;
    }
    if (data.stageTitle) {
      item.stageTitle = data.stageTitle;
    }

    updateBatchItemDOM(item);
    updateOverallBatchProgress();
  }

  function handleBatchStatus(data) {
    const item = batchQueue.find(i => i.id === data.id);
    if (!item) return;

    if (data.status === 'completed') {
      item.status = 'completed';
      item.percent = 100;
      item.stageTitle = 'Hoàn thành 100%';
      item.filePath = data.filePath;

      if (data.filePath) {
        const fileName = data.filePath.split(/[\\/]/).pop();
        if (fileName) {
          item.title = fileName.replace(/\.[^/.]+$/, '');
        }
      }

      saveToHistory({
        id: item.id,
        title: item.title,
        url: item.url,
        format: item.quality === 'audio' ? 'Audio MP3' : `${item.quality.toUpperCase()} (Hàng loạt)`,
        container: item.quality === 'audio' ? 'mp3' : (appConfig.container || 'mp4'),
        downloadPath: data.filePath || savedDownloadPath,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('vi-VN')
      });

      updateBatchItemDOM(item);
      updateOverallBatchProgress();
      currentBatchDownloadId = null;

      if (isBatchPaused) {
        showToast('Hàng đợi đang tạm dừng.', 'info');
      } else {
        processNextBatchItem();
      }
    } else if (data.status === 'error') {
      item.status = 'error';
      item.errorMsg = data.message || 'Lỗi tải video';
      item.stageTitle = 'Thất bại';

      updateBatchItemDOM(item);
      updateOverallBatchProgress();
      currentBatchDownloadId = null;

      showToast(`Video #${item.index || ''} gặp sự cố. Tự động chuyển video kế tiếp...`, 'error');

      if (!isBatchPaused) {
        setTimeout(() => processNextBatchItem(), 1000);
      }
    }
  }

  // =========================================================
  // CUSTOM GLASSMORPHIC DROPDOWNS CONTROLLER
  // =========================================================

  function setupCustomDropdowns() {
    const selects = [
      settingConnections,
      settingContainer,
      settingChunkSize,
      settingFpsMode,
      batchQualitySelect
    ];

    selects.forEach(selectEl => {
      if (selectEl) {
        initCustomDropdown(selectEl);
      }
    });

    // Close open dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
          dd.classList.remove('open');
        });
      }
    });
  }

  function initCustomDropdown(selectEl) {
    if (!selectEl || selectEl.dataset.hasCustomDropdown) return;
    selectEl.dataset.hasCustomDropdown = 'true';
    selectEl.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'custom-dropdown';
    wrap.id = `cd_${selectEl.id}`;

    const trigger = document.createElement('div');
    trigger.className = 'cd-trigger';

    const label = document.createElement('span');
    label.className = 'cd-selected-text';
    const selectedOption = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
    label.textContent = selectedOption ? selectedOption.textContent : '';

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('class', 'cd-chevron');
    chevron.setAttribute('width', '14');
    chevron.setAttribute('height', '14');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2');
    chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';

    trigger.appendChild(label);
    trigger.appendChild(chevron);

    const menu = document.createElement('div');
    menu.className = 'cd-menu';

    Array.from(selectEl.options).forEach(opt => {
      const item = document.createElement('div');
      item.className = `cd-option ${opt.value === selectEl.value ? 'active' : ''}`;
      item.dataset.value = opt.value;

      const itemText = document.createElement('span');
      itemText.textContent = opt.textContent;
      item.appendChild(itemText);

      const check = document.createElement('span');
      check.className = 'cd-check';
      check.textContent = opt.value === selectEl.value ? '✓' : '';
      item.appendChild(check);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEl.value = opt.value;
        syncCustomDropdown(selectEl);
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        wrap.classList.remove('open');
      });

      menu.appendChild(item);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrap.classList.contains('open');
      document.querySelectorAll('.custom-dropdown.open').forEach(dd => dd.classList.remove('open'));
      if (!isOpen) {
        wrap.classList.add('open');
      }
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);
  }

  function syncCustomDropdown(selectEl) {
    if (!selectEl) return;
    const wrap = document.getElementById(`cd_${selectEl.id}`);
    if (!wrap) return;

    const label = wrap.querySelector('.cd-selected-text');
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (label && selectedOption) {
      label.textContent = selectedOption.textContent;
    }

    const items = wrap.querySelectorAll('.cd-option');
    items.forEach(item => {
      const isSelected = item.dataset.value === selectEl.value;
      if (isSelected) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
      const check = item.querySelector('.cd-check');
      if (check) check.textContent = isSelected ? '✓' : '';
    });
  }

  function syncAllCustomDropdowns() {
    [
      settingConnections,
      settingContainer,
      settingChunkSize,
      settingFpsMode,
      batchQualitySelect
    ].forEach(el => {
      if (el) syncCustomDropdown(el);
    });
  }

  // Toast Helper
  let toastTimer = null;
  function showToast(msg, type = 'info') {
    if (!appToast) return;
    toastMessage.textContent = msg;
    appToast.className = `toast ${type}`;
    appToast.classList.remove('hidden');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      appToast.classList.add('hidden');
    }, 3500);
  }

  // Restore normal state smoothly when user re-opens tool (zero reload, zero white flash)
  if (window.api && window.api.onRestoreNormal) {
    window.api.onRestoreNormal(() => {
      if (!isDownloading) {
        checkClipboardAutoPaste();
        if (urlInput) {
          urlInput.focus();
        }
      }
    });
  }
});
