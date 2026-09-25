const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let isDev = process.argv.includes('--dev');
let currentLang = 'zh-CN';

const GITHUB_PROXY = 'https://gh-proxy.com/';
let downloadStartTime = 0;
let lastProgressTime = 0;
let lastProgressBytes = 0;

const i18n = {
  'zh-CN': {
    file: '文件',
    edit: '编辑',
    view: '视图',
    settings: '设置',
    help: '帮助',
    newWindow: '新窗口',
    close: '关闭',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    reload: '刷新',
    toggleDevTools: '开发者工具',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '重置缩放',
    language: '语言',
    chinese: '简体中文',
    english: 'English',
    about: '关于',
    aboutMessage: '光之圣女的小秘密\n版本: {version}\n由凯尔希电子助手系统生成',
    checkUpdates: '检查更新',
    visitWebsite: '访问网站'
  },
  'en-US': {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    settings: 'Settings',
    help: 'Help',
    newWindow: 'New Window',
    close: 'Close',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    reload: 'Reload',
    toggleDevTools: 'Toggle Developer Tools',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset Zoom',
    language: 'Language',
    chinese: '简体中文',
    english: 'English',
    about: 'About',
    aboutMessage: "Holy Maiden's Secrets\nVersion: {version}\nPowered by Kal'tsit Electronic Assistant System",
    checkUpdates: 'Check for Updates',
    visitWebsite: 'Visit Website'
  }
};

function t(key) {
  const lang = i18n[currentLang] || i18n['zh-CN'];
  return lang[key] || key;
}

function getDevProjectRoot() {
  const tryPaths = [
    'f:\\AIcodeName\\6ab2bbbf03d790ead0a6bf59\\光之圣女的小秘密',
    path.resolve(__dirname, '..', '..')
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(path.join(p, 'package.json'))) return p;
  }
  return null;
}

function isLocalDevMachine() {
  const devRoot = getDevProjectRoot();
  if (!devRoot) return false;
  return fs.existsSync(path.join(devRoot, 'dist'));
}

function getLocalUpdatePath() {
  const devRoot = getDevProjectRoot();
  if (!devRoot) return null;
  const distDir = path.join(devRoot, 'dist');
  if (!fs.existsSync(distDir)) return null;

  const exeFiles = fs.readdirSync(distDir).filter(f => {
    const lower = f.toLowerCase();
    return lower.endsWith('.exe') && (lower.includes('setup') || lower.includes('install'));
  });
  if (exeFiles.length === 0) return null;
  exeFiles.sort().reverse();
  return path.join(distDir, exeFiles[0]);
}

function getLocalUpdateVersion() {
  const exePath = getLocalUpdatePath();
  if (!exePath) return null;
  const fileName = path.basename(exePath);
  const match = fileName.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((parts1[i] || 0) > (parts2[i] || 0)) return 1;
    if ((parts1[i] || 0) < (parts2[i] || 0)) return -1;
  }
  return 0;
}

function getDailyNewsPath() {
  const devPath = path.resolve(__dirname, '..', '..', '..', 'daily-news', 'daily-news.html');
  if (fs.existsSync(devPath)) return devPath;
  const prodPath = path.join(process.resourcesPath, 'daily-news', 'daily-news.html');
  if (fs.existsSync(prodPath)) return prodPath;
  return devPath;
}

function getHistoryDir() {
  const userDataPath = app.getPath('userData');
  const historyDir = path.join(userDataPath, 'news-history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const oldPaths = [
    path.resolve(__dirname, '..', '..', '..', 'daily-news', 'history'),
    path.join(process.resourcesPath || '', 'daily-news', 'history')
  ];

  for (const oldDir of oldPaths) {
    if (oldDir && fs.existsSync(oldDir) && oldDir !== historyDir) {
      try {
        const oldFiles = fs.readdirSync(oldDir).filter(f => f.endsWith('.html'));
        for (const f of oldFiles) {
          const dest = path.join(historyDir, f);
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(path.join(oldDir, f), dest);
          }
        }
        if (oldFiles.length > 0) {
          console.log('Migrated', oldFiles.length, 'history files from', oldDir);
        }
      } catch (e) {}
    }
  }

  return historyDir;
}

function buildMenu() {
  const lang = currentLang;
  const template = [
    {
      label: t('file'),
      submenu: [
        { label: t('newWindow'), click: () => createWindow() },
        { type: 'separator' },
        { label: t('close'), accelerator: 'CmdOrCtrl+W', click: () => { if (mainWindow) mainWindow.close(); } }
      ]
    },
    {
      label: t('edit'),
      submenu: [
        { label: t('undo'), accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: t('redo'), accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: t('cut'), accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: t('copy'), accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: t('paste'), accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: t('selectAll'), accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: t('view'),
      submenu: [
        { label: t('reload'), accelerator: 'CmdOrCtrl+R', click: () => { if (mainWindow) mainWindow.webContents.reload(); } },
        { label: t('toggleDevTools'), accelerator: 'F12', click: () => { if (mainWindow) mainWindow.webContents.toggleDevTools(); } },
        { type: 'separator' },
        { label: t('zoomIn'), accelerator: 'CmdOrCtrl+=', click: () => { if (mainWindow) mainWindow.webContents.zoomLevel += 0.5; } },
        { label: t('zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => { if (mainWindow) mainWindow.webContents.zoomLevel -= 0.5; } },
        { label: t('resetZoom'), accelerator: 'CmdOrCtrl+0', click: () => { if (mainWindow) mainWindow.webContents.zoomLevel = 0; } }
      ]
    },
    {
      label: t('settings'),
      submenu: [
        {
          label: t('language'),
          submenu: [
            { label: t('chinese'), type: 'radio', checked: lang === 'zh-CN', click: () => switchLanguage('zh-CN') },
            { label: t('english'), type: 'radio', checked: lang === 'en-US', click: () => switchLanguage('en-US') }
          ]
        },
        { type: 'separator' },
        { label: t('checkUpdates'), click: () => { if (mainWindow) mainWindow.webContents.send('menu-check-updates'); } }
      ]
    },
    {
      label: t('help'),
      submenu: [
        { label: t('about'), click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: t('about'),
            message: t('aboutMessage').replace('{version}', app.getVersion()),
            buttons: ['OK']
          });
        }}
      ]
    }
  ];
  return Menu.buildFromTemplate(template);
}

function switchLanguage(lang) {
  currentLang = lang;
  Menu.setApplicationMenu(buildMenu());
  if (mainWindow) {
    mainWindow.webContents.send('language-changed', lang);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '光之圣女的小秘密',
    backgroundColor: '#0F0F1A',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  try {
    const updateConfig = autoUpdater.updateConfigPath;
    if (updateConfig && fs.existsSync(updateConfig)) {
      let configContent = fs.readFileSync(updateConfig, 'utf8');
      if (!configContent.includes('gh-proxy.com') && configContent.includes('github.com')) {
        const providerMatch = configContent.match(/provider:\s*github/);
        if (providerMatch) {
          configContent = configContent.replace(/owner:\s*(\S+)/, 'owner: chanyuzukiyukari-svg');
          configContent = configContent.replace(/repo:\s*(\S+)/, 'repo: lightgirl');
          configContent = configContent.replace(/url:\s*(https:\/\/github\.com\/[^\s]+)/g, (match, url) => {
            return 'url: ' + GITHUB_PROXY + url;
          });
        }
      }
    }
  } catch (e) {}

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      });
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded');
    }
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err.message);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      const now = Date.now();
      if (downloadStartTime === 0) {
        downloadStartTime = now;
        lastProgressTime = now;
        lastProgressBytes = 0;
      }

      const dt = (now - lastProgressTime) / 1000;
      const db = progress.transferred - lastProgressBytes;
      const speedMBs = dt > 0 ? db / dt / 1048576 : 0;
      lastProgressTime = now;
      lastProgressBytes = progress.transferred;

      mainWindow.webContents.send('download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        speed: speedMBs.toFixed(1)
      });
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 3000);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildMenu());
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-daily-news-path', () => {
  const newsPath = getDailyNewsPath();
  if (fs.existsSync(newsPath)) {
    return newsPath;
  }
  return null;
});

ipcMain.handle('get-tools-list', () => {
  const dailyNewsTool = {
    id: 'daily-news',
    name: '每日新闻日报',
    description: '全球权威新闻 + 社交媒体热搜 + 今日摘要 + 逝世通告',
    icon: 'newspaper',
    color: '#0969DA',
    enabled: fs.existsSync(getDailyNewsPath()),
    embedded: true
  };
  return [dailyNewsTool];
});

ipcMain.handle('open-tool', (event, toolId) => {
  return toolId === 'daily-news' && fs.existsSync(getDailyNewsPath());
});

ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { available: false, reason: 'dev-mode' };

  try {
    if (isLocalDevMachine()) {
      const localVer = getLocalUpdateVersion();
      const appVer = app.getVersion();
      if (localVer && compareVersions(localVer, appVer) > 0) {
        if (mainWindow) {
          mainWindow.webContents.send('update-available', {
            version: localVer,
            releaseNotes: '本地更新（本机直连）',
            source: 'local'
          });
        }
        return { available: true, version: localVer, source: 'local' };
      }
    }

    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      const remoteVer = result.updateInfo.version;
      const appVer = app.getVersion();
      if (compareVersions(remoteVer, appVer) > 0) {
        return { available: true, version: remoteVer, source: 'github' };
      }
      return { available: false, reason: 'already-latest' };
    }
    return { available: false, reason: 'no-info' };
  } catch (err) {
    return { available: false, error: err.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    if (isLocalDevMachine()) {
      const localPath = getLocalUpdatePath();
      if (localPath) {
        const { app } = require('electron');
        const downloadsPath = app.getPath('downloads');
        const localVer = getLocalUpdateVersion();
        const fileName = `光之圣女的小秘密-Setup-${localVer}.exe`;
        const destPath = path.join(downloadsPath, fileName);
        fs.copyFileSync(localPath, destPath);

        if (mainWindow) {
          mainWindow.webContents.send('download-progress', {
            percent: 100,
            transferred: fs.statSync(localPath).size,
            total: fs.statSync(localPath).size,
            speed: '0.0'
          });
          mainWindow.webContents.send('update-downloaded', { source: 'local', path: destPath });
        }
        return true;
      }
    }

    const infoProvider = autoUpdater.updateInfoAndProvider;
    if (infoProvider && infoProvider.provider && !infoProvider.provider._proxyPatched) {
      const provider = infoProvider.provider;
      const originalResolveUrls = provider.resolveUrls;
      if (originalResolveUrls) {
        provider.resolveUrls = async function(updateInfo) {
          const urls = await originalResolveUrls.call(this, updateInfo);
          return urls.map(url => {
            if (typeof url === 'string' && url.startsWith('https://github.com/')) {
              return GITHUB_PROXY + url;
            }
            return url;
          });
        };
        provider._proxyPatched = true;
      }
    }
    downloadStartTime = 0;
    lastProgressTime = 0;
    lastProgressBytes = 0;
    await autoUpdater.downloadUpdate();
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    language: currentLang,
    isLocal: isLocalDevMachine(),
    localUpdateVersion: getLocalUpdateVersion()
  };
});

ipcMain.handle('set-language', (event, lang) => {
  currentLang = lang;
  Menu.setApplicationMenu(buildMenu());
  return true;
});

ipcMain.handle('get-news-history', () => {
  const historyDir = getHistoryDir();
  try {
    const files = fs.readdirSync(historyDir)
      .filter(f => f.endsWith('.html'))
      .sort().reverse();
    return files.map(f => {
      const parts = f.replace('.html', '').split('_');
      const date = parts[0] || '';
      const time = parts[1] || '';
      const type = parts[2] || 'auto';
      return { filename: f, date, time, type, path: path.join(historyDir, f) };
    });
  } catch (err) {
    return [];
  }
});

ipcMain.handle('get-news-history-file', (event, filename) => {
  const historyDir = getHistoryDir();
  const filePath = path.join(historyDir, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
});

ipcMain.handle('get-news-publish-time', () => {
  const newsPath = getDailyNewsPath();
  if (!fs.existsSync(newsPath)) return null;
  const stat = fs.statSync(newsPath);
  return stat.mtime.toISOString();
});

ipcMain.handle('collect-news-manual', async (event) => {
  const historyDir = getHistoryDir();
  const newsPath = getDailyNewsPath();
  const now = new Date();
  const ts = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') + '_' +
    'manual';
  const archivePath = path.join(historyDir, `${ts}.html`);

  if (mainWindow) {
    mainWindow.webContents.send('collect-progress', { status: 'starting', message: '正在归档当前日报...' });
  }

  if (!fs.existsSync(newsPath)) {
    if (mainWindow) {
      mainWindow.webContents.send('collect-progress', { status: 'error', message: '日报文件不存在' });
    }
    return { success: false, error: '日报文件不存在' };
  }

  fs.copyFileSync(newsPath, archivePath);
  if (mainWindow) {
    mainWindow.webContents.send('collect-progress', { status: 'progress', message: '已归档，正在更新时间戳...' });
  }

  const publishTime = new Date().toISOString();
  let content = fs.readFileSync(newsPath, 'utf8');

  const dateMatch = content.match(/日期：[^<\n]*/);
  if (dateMatch) {
    const weekdays = ['日','一','二','三','四','五','日'];
    content = content.replace(dateMatch[0], '日期：' + now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日 ' + '星期' + weekdays[now.getDay()]);
  }

  const timeMatch = content.match(/发布时间：[^<\n]*/);
  if (timeMatch) {
    content = content.replace(timeMatch[0], '发布时间：' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ' CST');
  }

  const collectedMarker = /<!-- collected: .* -->/;
  const newMarker = '<!-- collected: ' + publishTime + ' -->';
  if (collectedMarker.test(content)) {
    content = content.replace(collectedMarker, newMarker);
  } else if (!content.includes('collected:')) {
    content = content.replace('</body>', newMarker + '\n</body>');
  }

  fs.writeFileSync(newsPath, content, 'utf8');
  fs.copyFileSync(newsPath, archivePath);

  if (mainWindow) {
    mainWindow.webContents.send('collect-progress', {
      status: 'done',
      message: '收集完成 · ' + now.toLocaleString('zh-CN'),
      archivePath,
      publishTime: publishTime
    });
  }

  return { success: true, archivePath, publishTime, collected: true };
});
