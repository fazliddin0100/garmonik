param(
  [string]$AgentUrl = "http://127.0.0.1:17888"
)

$ErrorActionPreference = "Stop"

# ESC @ + "GARMONIK test" + LF + GS V 0 (qisman kesish)
$testBytes = [byte[]](0x1B, 0x40) + [Text.Encoding]::ASCII.GetBytes("GARMONIK test`n") + [byte[]](0x1D, 0x56, 0x00)
$base64 = [Convert]::ToBase64String($testBytes)
$body = "data=" + [uri]::EscapeDataString($base64)

Write-Host "Agent test chop etish ($AgentUrl)..." -ForegroundColor Cyan

try {
  $health = Invoke-RestMethod -Uri "$AgentUrl/health" -TimeoutSec 5
  Write-Host ("Agent: OK | printer: {0} | ready: {1} | status: {2}" -f `
      $health.printerName, $health.printerReady, $health.printerStatus) -ForegroundColor Gray
  if ($health.warning) {
    Write-Host "Ogohlantirish: $($health.warning)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "Agent /health javob bermadi: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

try {
  $response = Invoke-WebRequest -UseBasicParsing -Method POST `
    -Uri "$AgentUrl/print" `
    -ContentType "application/x-www-form-urlencoded;charset=UTF-8" `
    -Body $body -TimeoutSec 20
  Write-Host $response.Content -ForegroundColor Green
  exit 0
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
  }
  exit 1
}
