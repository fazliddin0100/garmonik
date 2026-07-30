@echo off
title Garmonik Kassa - Avtomatik ishga tushirishni o'chirish
cd /d "%~dp0"

set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Garmonik Print Agent.lnk"
if exist "%LINK%" del "%LINK%"

call "%~dp0stop-agent.bat"

echo Avtomatik ishga tushirish o'chirildi.
pause
