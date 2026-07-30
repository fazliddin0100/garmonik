# Bosqich 7 tekshiruvi - eski kassa_session olib tashlangan
#   npm run merge:verify-phase-7

$ErrorActionPreference = "Continue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$repoRoot = Split-Path $root -Parent
$failed = 0

function Check($label, $condition) {
    if ($condition) {
        Write-Host "[OK] $label" -ForegroundColor Green
    } else {
        Write-Host "[??] $label" -ForegroundColor Yellow
        $script:failed++
    }
}

Write-Host "=== Bosqich 7 tekshiruvi (legacy auth arxiv) ===" -ForegroundColor Cyan
Write-Host ""

$authPath = Join-Path $root "lib\kassa\auth.ts"
$proxyPath = Join-Path $root "lib\auth\kassa-proxy.ts"
$unifiedPath = Join-Path $root "lib\kassa\unified-session.ts"
$archivedPath = Join-Path $repoRoot "garmonik-kassa\ARCHIVED.md"

Check "auth.ts: faqat garmonik_session" (
    (Select-String -Path $authPath -Pattern "SESSION_COOKIE_NAME" -Quiet) -and
    -not (Select-String -Path $authPath -Pattern "'kassa_session'" -CaseSensitive -Quiet) -and
    -not (Select-String -Path $authPath -Pattern "KASSA_LEGACY" -Quiet)
)
Check "kassa-proxy: legacy cookie yoq" (
    -not (Select-String -Path $proxyPath -Pattern "'kassa_session'" -CaseSensitive -Quiet) -and
    -not (Select-String -Path $proxyPath -Pattern "verifyLegacyKassaCookie" -Quiet)
)
Check "unified-session: KASSA_LEGACY yoq" (
    -not (Select-String -Path $unifiedPath -Pattern "KASSA_LEGACY" -Quiet)
)
Check "garmonik-kassa ARCHIVED.md" (Test-Path $archivedPath)

$libHits = @(
    Select-String -Path (Join-Path $root "lib\**\*.ts") -Pattern "'kassa_session'" -CaseSensitive -ErrorAction SilentlyContinue
    Select-String -Path (Join-Path $root "app\**\*.ts") -Pattern "'kassa_session'" -CaseSensitive -ErrorAction SilentlyContinue
    Select-String -Path (Join-Path $root "app\**\*.tsx") -Pattern "'kassa_session'" -CaseSensitive -ErrorAction SilentlyContinue
) | Where-Object { $_ }

Check "kod bazasida kassa_session qolmagan" ($libHits.Count -eq 0)

Write-Host ""
Write-Host "Smoke test (dev server ixtiyoriy)..." -ForegroundColor Cyan

$devOk = $false
foreach ($port in @(3000, 3001)) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait -and $tcp.Connected) {
            $devOk = $true
            $tcp.Close()
            break
        }
        $tcp.Close()
    } catch { }
}

if (-not $devOk) {
    Write-Host "[SKIP] Dev server ishlamayapti - smoke otkazilmadi." -ForegroundColor Yellow
    Write-Host "  npm run dev; npm run merge:smoke-kassa-phase-7" -ForegroundColor Yellow
} else {
    Push-Location $root
    node scripts/merge/smoke-kassa-phase-7.mjs
    if ($LASTEXITCODE -ne 0) { $failed++ }
    Pop-Location
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 7 TAYYOR - faqat garmonik_session ishlatiladi." -ForegroundColor Green
    Write-Host "Eski kassa_session cookie bolsa, /kassa/login dan qayta kiring."
} else {
    Write-Host "Bosqich 7 tugallanmagan." -ForegroundColor Yellow
}
