@echo off
cd /d "%~dp0"

if exist "agent.pid" (
  set /p AGENT_PID=<agent.pid
  taskkill /PID %AGENT_PID% /F >nul 2>&1
  del "agent.pid" >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":17888 .*LISTENING"') do (
  taskkill /PID %%p /F >nul 2>&1
)

echo Agent to'xtatildi.
