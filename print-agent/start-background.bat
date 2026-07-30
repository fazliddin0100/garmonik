@echo off
title Garmonik Kassa - Fon rejimida ishga tushirish
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js topilmadi. https://nodejs.org dan o'rnating.
  pause
  exit /b 1
)

wscript.exe "%~dp0run-agent-hidden.vbs"
timeout /t 2 /nobreak >nul

powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:17888/health -TimeoutSec 3).StatusCode } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo Agent ishga tushmadi. agent.log faylini tekshiring.
  pause
  exit /b 1
)

echo.
echo  Agent fon rejimida ishga tushdi.
echo  Terminal oynasini yopishingiz mumkin - chop etish ishlayveradi.
echo  To'xtatish: stop-agent.bat
echo.
timeout /t 4 /nobreak >nul
