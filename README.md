# 光之圣女的小秘密 · Holy Maiden's Secrets

工具集合桌面应用，基于 Electron 构建，支持热更新。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包 EXE
npm run build

# 仅打包到目录（不生成安装程序，用于测试）
npm run build:dir
```

## 项目结构

```
光之圣女的小秘密/
├── package.json              # 项目配置 + electron-builder 配置
├── build/
│   ├── icon.ico              # 应用图标（Windows）
│   └── icon.jpg              # 图标原图
├── src/
│   ├── main/
│   │   ├── main.js           # Electron 主进程
│   │   └── preload.js        # 预加载脚本（安全 IPC 桥接）
│   └── renderer/
│       ├── index.html         # Hub Dashboard 页面
│       └── assets/
│           ├── style.css      # 界面样式
│           └── app.js         # 前端逻辑
├── tools/                    # 子工具目录（预留扩展）
└── dist/                     # 打包输出目录
```

## 子工具

### 1. 每日新闻日报
- 路径：`../daily-news/daily-news.html`
- 功能：全球权威新闻 + 社交媒体热搜 + 今日摘要 + 逝世通告
- 点击工具卡片在子窗口中打开日报

## 热更新机制

- 使用 `electron-updater` 实现
- 配置了 GitHub Releases 作为更新源
- 更新流程：检查更新 → 下载 → 安装重启
- 前端通过 IPC 监听更新状态并显示通知

## 扩展新子工具

1. 在 `tools/` 目录下创建新工具的 HTML 文件
2. 在 `src/main/main.js` 的 `get-tools-list` IPC 中注册新工具
3. 在 `src/main/main.js` 的 `open-tool` IPC 中添加打开逻辑
4. 在 `src/renderer/assets/app.js` 的 `toolIcons` 中添加图标映射

## 技术栈

- Electron 33.x — 跨平台桌面应用框架
- electron-builder 25.x — 打包与分发
- electron-updater 6.x — 自动更新
- 原生 HTML/CSS/JS — 无框架依赖的渲染层
