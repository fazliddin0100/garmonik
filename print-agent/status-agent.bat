@echo off
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $h = Invoke-RestMethod http://127.0.0.1:17888/health -TimeoutSec 5; Write-Host 'Agent ISHLAYAPTI' -ForegroundColor Green; Write-Host ('  Printer: ' + $h.printerName); Write-Host ('  Holat:   ' + $h.printerStatus); Write-Host ('  Tayyor:  ' + $h.printerReady); if ($h.warning) { Write-Host ('  Ogohlantirish: ' + $h.warning) -ForegroundColor Yellow }; exit 0 } catch { Write-Host 'Agent ISHLAMAYAPTI' -ForegroundColor Red; Write-Host $_.Exception.Message; exit 1 }"

pause
