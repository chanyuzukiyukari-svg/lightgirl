@echo off
chcp 65001 >nul
echo ========================================
echo  光之圣女的小秘密 - 运行脚本
echo ========================================
echo.

cd /d "%~dp0"

set ELECTRON_CACHE=%cd%\.electron-cache

echo 启动应用...
npx electron . --dev

pause
