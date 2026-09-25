const toolIcons = {
  newspaper: '\uD83D\uDCF0',
  weather: '\u2600\uFE0F',
  calendar: '\uD83D\uDCC5',
  calculator: '\uD83E\uDDED',
  chart: '\uD83D\uDCCA'
};

let updateInfo = null;
let currentLang = 'zh-CN';
let isViewingHistory = false;

const i18n = {
  'zh-CN': {
    version: '版本',
    latest: '已是最新版本',
    devMode: '开发模式下不检查更新',
    noTools: '暂无可用工具。工具加载中……',
    news: '新闻 资讯',
    ready: '已就绪',
    offline: '未就绪',
    open: '打开',
    back: '返回',
    dailyNews: '每日新闻日报',
    manualCollect: '手动收集',
    collecting: '收集中...',
    refresh: '刷新',
    history: '历史',
    historyArchive: '历史归档',
    noHistory: '暂无历史归档',
    manual: '手动',
    auto: '自动',
    newVersionFound: '发现新版本',
    newVersionAvailable: '新版本已可用。',
    updateSource: '更新来源',
    localUpdate: '本机直连（局域网）',
    githubUpdate: 'GitHub 代理加速',
    later: '稀后更新',
    download: '立即下载',
    downloading: '正在下载更新',
    install: '立即安装并重启',
    downloadComplete: '下载完成',
    updateFailed: '更新失败',
    collectingData: '正在收集新闻数据...',
    collectDone: '收集完成',
    collectFailed: '收集失败',
    publishTime: '发布时间'
  },
  'en-US': {
    version: 'Version',
    latest: 'Already up to date',
    devMode: 'Update check disabled in dev mode',
    noTools: 'No tools available. Loading...',
    news: 'News',
    ready: 'Ready',
    offline: 'Offline',
    open: 'Open',
    back: 'Back',
    dailyNews: 'Daily News Report',
    manualCollect: 'Collect',
    collecting: 'Collecting...',
    refresh: 'Refresh',
    history: 'History',
    historyArchive: 'History Archive',
    noHistory: 'No history available',
    manual: 'Manual',
    auto: 'Auto',
    newVersionFound: 'New Version Available',
    newVersionAvailable: 'New version is available.',
    updateSource: 'Source',
    localUpdate: 'Local (Direct)',
    githubUpdate: 'GitHub (Proxy)',
    later: 'Later',
    download: 'Download',
    downloading: 'Downloading Update',
    install: 'Install & Restart',
    downloadComplete: 'Download Complete',
    updateFailed: 'Update Failed',
    collectingData: 'Collecting news data...',
    collectDone: 'Collection complete',
    collectFailed: 'Collection failed',
    publishTime: 'Published'
  }
};

function t(key) {
  const lang = i18n[currentLang] || i18n['zh-CN'];
  return lang[key] || key;
}

async function init() {
  const info = await window.api.getAppInfo();
  currentLang = info.language || 'zh-CN';
  document.getElementById('version').textContent = 'v' + info.version;
  document.getElementById('langSelect').value = currentLang;

  const tools = await window.api.getToolsList();
  renderTools(tools);

  setupUpdateListeners();
  setupNewsView();
  setupLanguageSelector();
}

function renderTools(tools) {
  const grid = document.getElementById('toolsGrid');
  const empty = document.getElementById('emptyState');

  if (!tools || tools.length === 0) {
    empty.style.display = 'flex';
    grid.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'grid';

  grid.innerHTML = tools.map(tool => {
    const icon = toolIcons[tool.icon] || '\uD83D\uDD27';
    const statusClass = tool.enabled ? '' : 'tool-card--disabled';
    const statusBadge = tool.enabled
      ? '<span class="tool-card__status">\u25CF ' + t('ready') + '</span>'
      : '<span class="tool-card__status tool-card__status--offline">\u25CF ' + t('offline') + '</span>';

    return `
      <div class="tool-card ${statusClass}" data-tool-id="${tool.id}" style="--tool-color: ${tool.color}; --tool-color-soft: ${tool.color}22;">
        <div class="tool-card__header">
          <div class="tool-card__icon">${icon}</div>
          <div class="tool-card__info">
            <div class="tool-card__name">${tool.name}</div>
            ${statusBadge}
          </div>
        </div>
        <div class="tool-card__description">${tool.description}</div>
        <div class="tool-card__footer">
          <span class="tool-card__category">${t('news')}</span>
          <span class="tool-card__open">
            ${t('open')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', async () => {
      const toolId = card.getAttribute('data-tool-id');
      if (toolId === 'daily-news') {
        await openEmbeddedNews();
      } else {
        window.api.openTool(toolId);
      }
    });
  });
}

async function openEmbeddedNews() {
  const newsPath = await window.api.getDailyNewsPath();
  if (!newsPath) {
    alert('\u65E5\u62A5\u6587\u4EF6\u4E0D\u5B58\u5728');
    return;
  }

  document.getElementById('hubView').style.display = 'none';
  document.getElementById('newsView').style.display = 'flex';
  loadNewsIntoIframe(newsPath);
  await loadPublishTime();
  await loadHistory();
}

function loadNewsIntoIframe(newsPath) {
  const iframe = document.getElementById('newsIframe');
  const sep = newsPath.includes('?') ? '&' : '?';
  iframe.src = 'file:///' + newsPath.replace(/\\/g, '/') + sep + '_t=' + Date.now();
  isViewingHistory = false;
  document.getElementById('backToLatestBtn').style.display = 'none';
}

function loadHistoryIntoIframe(newsPath) {
  const iframe = document.getElementById('newsIframe');
  const sep = newsPath.includes('?') ? '&' : '?';
  iframe.src = 'file:///' + newsPath.replace(/\\/g, '/') + sep + '_t=' + Date.now();
  isViewingHistory = true;
  document.getElementById('backToLatestBtn').style.display = 'inline-flex';
}

async function loadPublishTime() {
  const publishTimeEl = document.getElementById('publishTime');
  try {
    const pubTime = await window.api.getNewsPublishTime();
    if (pubTime) {
      const d = new Date(pubTime);
      const timeStr = d.getFullYear() + '-' +
        String(d.getMonth()+1).padStart(2,'0') + '-' +
        String(d.getDate()).padStart(2,'0') + ' ' +
        String(d.getHours()).padStart(2,'0') + ':' +
        String(d.getMinutes()).padStart(2,'0');
      publishTimeEl.textContent = t('publishTime') + ': ' + timeStr;
      publishTimeEl.style.display = 'block';
    } else {
      publishTimeEl.style.display = 'none';
    }
  } catch (e) {
    publishTimeEl.style.display = 'none';
  }
}

function setupNewsView() {
  document.getElementById('backToHub').addEventListener('click', () => {
    document.getElementById('newsView').style.display = 'none';
    document.getElementById('hubView').style.display = '';
    document.getElementById('newsIframe').src = '';
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const newsPath = await window.api.getDailyNewsPath();
    if (newsPath) {
      loadNewsIntoIframe(newsPath);
      await loadPublishTime();
    }
  });

  document.getElementById('collectBtn').addEventListener('click', async () => {
    const btn = document.getElementById('collectBtn');
    btn.disabled = true;
    btn.textContent = t('collecting');

    const status = document.getElementById('collectStatus');
    const statusText = document.getElementById('collectStatusText');
    const statusIcon = document.getElementById('collectStatusIcon');
    status.style.display = 'flex';
    statusIcon.textContent = '\u23F3';
    statusText.textContent = t('collectingData');

    await window.api.collectNewsManual();
  });

  document.getElementById('toggleHistoryBtn').addEventListener('click', async () => {
    const sidebar = document.getElementById('historySidebar');
    const isVisible = sidebar.style.display !== 'none';
    sidebar.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) await loadHistory();
  });

  document.getElementById('closeHistoryBtn').addEventListener('click', () => {
    document.getElementById('historySidebar').style.display = 'none';
  });

  window.api.onCollectProgress((data) => {
    const btn = document.getElementById('collectBtn');
    const status = document.getElementById('collectStatus');
    const statusText = document.getElementById('collectStatusText');
    const statusIcon = document.getElementById('collectStatusIcon');

    if (data.status === 'starting') {
      status.style.display = 'flex';
      statusIcon.textContent = '\u23F3';
      statusText.textContent = data.message;
    } else if (data.status === 'progress') {
      status.style.display = 'flex';
      statusIcon.textContent = '\u23F3';
      statusText.textContent = data.message;
    } else if (data.status === 'done') {
      statusIcon.textContent = '\u2705';
      statusText.textContent = data.message;
      btn.disabled = false;
      btn.textContent = t('manualCollect');

      window.api.getDailyNewsPath().then(p => {
        if (p) {
          loadNewsIntoIframe(p);
          loadPublishTime();
        }
      });
      loadHistory();

      setTimeout(() => { status.style.display = 'none'; }, 3000);
    } else if (data.status === 'error') {
      statusIcon.textContent = '\u274C';
      statusText.textContent = data.message;
      btn.disabled = false;
      btn.textContent = t('manualCollect');
      setTimeout(() => { status.style.display = 'none'; }, 5000);
    }
  });
}

async function loadHistory() {
  const list = document.getElementById('historyList');
  const history = await window.api.getNewsHistory();

  if (!history || history.length === 0) {
    list.innerHTML = '<div class="history-panel__empty">' + t('noHistory') + '</div>';
    return;
  }

  list.innerHTML = history.map(item => {
    const typeLabel = item.type === 'manual' ? t('manual') : t('auto');
    const typeClass = item.type === 'manual' ? 'history-item--manual' : 'history-item--auto';
    const timeFmt = item.time.length >= 4 ? item.time.slice(0,2) + ':' + item.time.slice(2) : item.time;
    return `
      <div class="history-item ${typeClass}" data-filename="${item.filename}">
        <div class="history-item__date">${item.date}</div>
        <div class="history-item__time">${timeFmt}</div>
        <span class="history-item__type">${typeLabel}</span>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', async () => {
      const filename = el.getAttribute('data-filename');
      const filePath = await window.api.getNewsHistoryFile(filename);
      if (filePath) {
        loadHistoryIntoIframe(filePath);
      }
    });
  });

  const backToLatestBtn = document.getElementById('backToLatestBtn');
  if (!backToLatestBtn._hasListener) {
    backToLatestBtn._hasListener = true;
    backToLatestBtn.addEventListener('click', async () => {
      const newsPath = await window.api.getDailyNewsPath();
      if (newsPath) {
        loadNewsIntoIframe(newsPath);
        await loadPublishTime();
      }
    });
  }
}

function setupLanguageSelector() {
  document.getElementById('langSelect').addEventListener('change', async (e) => {
    currentLang = e.target.value;
    await window.api.setLanguage(currentLang);
    location.reload();
  });

  window.api.onLanguageChanged((lang) => {
    currentLang = lang;
    document.getElementById('langSelect').value = lang;
  });
}

function setupUpdateListeners() {
  const checkUpdates = async () => {
    const result = await window.api.checkForUpdates();
    if (result.available) {
      updateInfo = result;
      showUpdateModal(result);
    } else {
      showNoUpdateToast(result.reason || result.error);
    }
  };

  document.getElementById('updateBtn').addEventListener('click', checkUpdates);

  if (window.api.onMenuCheckUpdates) {
    window.api.onMenuCheckUpdates(checkUpdates);
  }

  document.getElementById('laterBtn').addEventListener('click', () => {
    document.getElementById('updateModal').style.display = 'none';
  });

  document.getElementById('downloadBtn').addEventListener('click', async () => {
    document.getElementById('updateModal').style.display = 'none';
    document.getElementById('progressModal').style.display = 'flex';
    document.getElementById('progressFill').style.width = '0%';

    if (updateInfo && updateInfo.source === 'local') {
      document.getElementById('progressText').textContent = '本机直连复制中...';
      document.getElementById('progressSpeed').textContent = '';
    } else {
      document.getElementById('progressText').textContent = '0% · 代理加速下载中...';
      document.getElementById('progressSpeed').textContent = '';
    }

    await window.api.downloadUpdate();
  });

  document.getElementById('installBtn').addEventListener('click', () => {
    window.api.installUpdate();
  });

  window.api.onUpdateAvailable((info) => {
    updateInfo = info;
    document.getElementById('updateBtn').classList.add('app__update-btn--has-update');
    showUpdateModal(info);
  });

  window.api.onUpdateDownloaded((data) => {
    document.getElementById('progressFill').style.width = '100%';
    const source = data && data.source === 'local' ? '本机直连' : '';
    document.getElementById('progressText').textContent = t('downloadComplete') + (source ? ' (' + source + ')' : '');
    document.getElementById('progressFooter').style.display = 'flex';
  });

  window.api.onDownloadProgress((data) => {
    const pct = Math.round(data.percent);
    document.getElementById('progressFill').style.width = pct + '%';
    const speed = data.speed ? ' · ' + data.speed + ' MB/s' : '';
    document.getElementById('progressText').textContent = pct + '%' + speed;
    if (data.speed) {
      document.getElementById('progressSpeed').textContent = '代理加速下载中 · ' + data.speed + ' MB/s';
    }
  });

  window.api.onUpdateError((msg) => {
    document.getElementById('progressText').textContent = t('updateFailed') + ': ' + msg;
  });
}

function showUpdateModal(info) {
  document.getElementById('newVersion').textContent = 'v' + (info.version || '');
  const sourceEl = document.getElementById('updateSource');
  if (info.source === 'local') {
    sourceEl.textContent = t('updateSource') + ': ' + t('localUpdate');
    sourceEl.style.display = 'block';
  } else {
    sourceEl.textContent = t('updateSource') + ': ' + t('githubUpdate');
    sourceEl.style.display = 'block';
  }
  const notesEl = document.getElementById('releaseNotes');
  if (info.releaseNotes) {
    notesEl.innerHTML = info.releaseNotes;
    notesEl.style.display = 'block';
  } else {
    notesEl.style.display = 'none';
  }
  document.getElementById('updateModal').style.display = 'flex';
}

function showNoUpdateToast(reason) {
  if (reason === 'dev-mode') {
    alert(t('devMode'));
  } else if (reason === 'local-latest') {
    alert(t('latest') + ' (本机已是最新)');
  } else {
    alert(t('latest'));
  }
}

init();
