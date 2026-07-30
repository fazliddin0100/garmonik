@echo off
title Garmonik Kassa - Avtomatik ishga tushirish
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js topilmadi. https://nodejs.org dan o'rnating.
  pause
  exit /b 1
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LINK=%STARTUP%\Garmonik Print Agent.lnk"
set "VBS=%~dp0run-agent-hidden.vbs"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -COM WScript.Shell).CreateShortcut('%LINK%');" ^
  "$s.TargetPath = 'wscript.exe';" ^
  "$s.Arguments = '\"\"\"%VBS%\"\"\"';" ^
  "$s.WorkingDirectory = '%~dp0';" ^
  "$s.WindowStyle = 7;" ^
  "$s.Description = 'Garmonik Kassa chek chop etish agenti';" ^
  "$s.Save()"

if errorlevel 1 (
  echo O'rnatishda xato.
  pause
  exit /b 1
)

wscript.exe "%VBS%"

echo.
echo  Tayyor!
echo  - Kompyuter har safar yoqilganda agent avtomatik ishga tushadi.
echo  - Terminal oynasi ochilmaydi.
echo  - O'chirish: uninstall-autostart.bat
echo.
pause
