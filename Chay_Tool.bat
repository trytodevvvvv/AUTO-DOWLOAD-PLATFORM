@echo off
title HYPER TUBE - YouTube Speed Downloader
echo ========================================================
echo        DANG KHOI DONG HYPER TUBE PRO 16X...
echo ========================================================
cd /d "%~dp0"
call npx electron .
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Khong the khoi chay qua npx. Dang thu npm start...
    call npm start
)
pause
