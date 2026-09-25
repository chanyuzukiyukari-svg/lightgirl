@echo off
chcp 65001 >nul
echo ========================================
echo  光之圣女的小秘密 - 发布到 GitHub Releases
echo ========================================
echo.

cd /d "%~dp0"

set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
set ELECTRON_CACHE=%cd%\.electron-cache
set ELECTRON_BUILDER_CACHE=%cd%\.electron-cache
if "%GH_TOKEN%"=="" (
    echo [警告] 未设置 GH_TOKEN 环境变量，发布功能将不可用
    echo 请先设置：set GH_TOKEN=你的GitHub个人访问令牌
    echo.
)

echo 检查依赖...
if not exist "node_modules\electron\dist\electron.exe" (
    echo electron.exe 未找到，正在下载...
    node download-electron-manual.js
)

echo.
echo 开始打包并发布...
call npx electron-builder --win -p always

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 发布失败！请检查错误信息。
    pause
    exit /b 1
)

echo.
echo 发布成功！
echo Release URL: https://github.com/chanyuzukiyukari-svg/lightgirl/releases
echo.
pause
