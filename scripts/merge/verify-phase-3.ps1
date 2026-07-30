# Bosqich 3 tekshiruvi
#   npm run merge:verify-phase-3

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

Write-Host "=== Bosqich 3 tekshiruvi (auth) ===" -ForegroundColor Cyan
Write-Host ""

Check "session-jwt: kassa kind" (Select-String -Path (Join-Path $root "lib\auth\session-jwt.ts") -Pattern "kind: 'kassa'" -Quiet)
Check "unified-session.ts mavjud" (Test-Path (Join-Path $root "lib\kassa\unified-session.ts"))
Check "kassa-proxy.ts mavjud" (Test-Path (Join-Path $root "lib\auth\kassa-proxy.ts"))
Check "proxy.ts: kassa matcher" (Select-String -Path (Join-Path $root "proxy.ts") -Pattern "/kassa/:path\*" -Quiet)
Check "auth.ts: garmonik_session" (Select-String -Path (Join-Path $root "lib\kassa\auth.ts") -Pattern "SESSION_COOKIE_NAME" -Quiet)

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 3 TAYYOR - /kassa/login dan qayta kiring (yangi cookie)." -ForegroundColor Green
    Write-Host "Tekshiruv: kassa login -> /kassa ochiladi, /kassa-admin faqat ADMIN uchun."
} else {
    Write-Host "Bosqich 3 tugallanmagan." -ForegroundColor Yellow
}
