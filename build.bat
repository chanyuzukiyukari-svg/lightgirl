@echo off
chcp 65001 >nul
echo ========================================
echo  光之圣女的小秘密 - EXE 打包脚本
echo ========================================
echo.

cd /d "%~dp0"

set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
set ELECTRON_CACHE=%cd%\.electron-cache
set ELECTRON_BUILDER_CACHE=%cd%\.electron-cache

echo [1/3] 检查依赖...
if not exist "node_modules\electron\dist\electron.exe" (
    echo electron.exe 未找到，正在下载...
    node download-electron-manual.js
)

echo [2/3] 开始打包...
call npx electron-builder --win

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 打包失败！请检查错误信息。
    pause
    exit /b 1
)

echo.
echo [3/3] 打包完成！
echo 安装程序: dist\光之圣女的小秘密 Setup 1.0.0.exe
echo 免安装版: dist\win-unpacked\光之圣女的小秘密.exe
echo.
pause
