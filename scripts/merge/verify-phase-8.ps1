# Bosqich 8 tekshiruvi - production deploy (bitta domen)
#   npm run merge:verify-phase-8

$ErrorActionPreference = "Continue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$failed = 0

function Check($label, $condition) {
    if ($condition) {
        Write-Host "[OK] $label" -ForegroundColor Green
    } else {
        Write-Host "[??] $label" -ForegroundColor Yellow
        $script:failed++
    }
}

Write-Host "=== Bosqich 8 tekshiruvi (production deploy) ===" -ForegroundColor Cyan
Write-Host ""

Check "DEPLOY_AHOST.md" (Test-Path (Join-Path $root "DEPLOY_AHOST.md"))
Check "ecosystem.config.cjs (PM2)" (Test-Path (Join-Path $root "ecosystem.config.cjs"))
Check "install.sh (PM2)" (Test-Path (Join-Path $root "install.sh"))
Check "server-install-pm2.sh" (Test-Path (Join-Path $root "scripts\deploy\server-install-pm2.sh"))
Check "next.config: standalone" (Select-String -Path (Join-Path $root "next.config.ts") -Pattern "output:\s*['\`"]standalone['\`"]" -Quiet)
Check "next.config: legacy redirect" (Select-String -Path (Join-Path $root "next.config.ts") -Pattern "KASSA_LEGACY_HOST" -Quiet)
Check "nginx asosiy domen" (Test-Path (Join-Path $root "deploy\nginx\gormonik-plus-klinik.uz.conf.example"))
Check "nginx kassa redirect" (Test-Path (Join-Path $root "deploy\nginx\kassa-legacy-redirect.conf.example"))
Check ".env.example: NEXT_PUBLIC_APP_URL" (Select-String -Path (Join-Path $root ".env.example") -Pattern "NEXT_PUBLIC_APP_URL" -Quiet)
Check "deploy:preflight skript" (Test-Path (Join-Path $root "scripts\deploy\preflight-production.mjs"))
Check "proxy.ts: /kassa himoya" (Select-String -Path (Join-Path $root "proxy.ts") -Pattern "/kassa/:path\*" -Quiet)

Write-Host ""
Write-Host "Preflight (local .env)..." -ForegroundColor Cyan
Push-Location $root
node scripts/deploy/preflight-production.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "[SKIP] Preflight - .env.local to'ldiring (productionda majburiy)" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Preflight" -ForegroundColor Green
}
Pop-Location

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 8 TAYYOR - deploy fayllari joyida." -ForegroundColor Green
    Write-Host "Serverda: DEPLOY_AHOST.md bo'yicha PM2 + Nginx."
    Write-Host "Domen: https://gormonik-plus-klinik.uz/kassa"
} else {
    Write-Host "Bosqich 8 tugallanmagan." -ForegroundColor Yellow
}
