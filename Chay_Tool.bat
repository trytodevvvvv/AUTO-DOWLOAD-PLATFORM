@echo off
title HYPER TUBE - YouTube Speed Downloader
echo ========================================================
echo        DANG KHOI DONG HYPER TUBE PRO 16X...
echo ========================================================
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
set ELECTRON_NO_ATTACH_CONSOLE=1

if exist "node_modules\.bin\electron.cmd" (
    call "node_modules\.bin\electron.cmd" .
) else (
    call npx electron .
)

if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the khoi chay. Dang thu npm start...
    call npm start
)
pause
