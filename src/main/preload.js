const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getToolsList: () => ipcRenderer.invoke('get-tools-list'),
  openTool: (toolId) => ipcRenderer.invoke('open-tool', toolId),
  getDailyNewsPath: () => ipcRenderer.invoke('get-daily-news-path'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  setLanguage: (lang) => ipcRenderer.invoke('set-language', lang),
  getNewsHistory: () => ipcRenderer.invoke('get-news-history'),
  getNewsHistoryFile: (filename) => ipcRenderer.invoke('get-news-history-file', filename),
  getNewsPublishTime: () => ipcRenderer.invoke('get-news-publish-time'),
  collectNewsManual: () => ipcRenderer.invoke('collect-news-manual'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, data) => callback(data)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_, msg) => callback(msg)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (_, data) => callback(data)),
  onCollectProgress: (callback) => ipcRenderer.on('collect-progress', (_, data) => callback(data)),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (_, lang) => callback(lang)),
  onMenuCheckUpdates: (callback) => ipcRenderer.on('menu-check-updates', () => callback())
});
