@echo off
title Garmonik Kassa - Debug rejim (faqat texnik xodim uchun)
cd /d "%~dp0"

echo.
echo  DEBUG rejim - terminal ochiq qoladi.
echo  Oddiy foydalanuvchi uchun: install-autostart.bat yoki start-background.bat
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  XATO: Node.js topilmadi.
  echo  https://nodejs.org dan LTS versiyani o'rnating.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -p "process.version"') do set NODE_VER=%%v
echo  Node.js: %NODE_VER%

for /f "delims=" %%v in ('node -p "parseInt(process.versions.node.split('.')[0], 10)"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 12 (
  echo.
  echo  XATO: Node.js juda eski. Kamida v12 LTS kerak.
  pause
  exit /b 1
)

node agent.js
pause
