# Bosqich 4 tekshiruvi
#   npm run merge:verify-phase-4
# Dev server ishlab turishi kerak: npm run dev

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

Write-Host "=== Bosqich 4 tekshiruvi (kassa UI) ===" -ForegroundColor Cyan
Write-Host ""

Check "payment-form.tsx" (Test-Path (Join-Path $root "components\kassa\payment\payment-form.tsx"))
Check "cashier-workspace.tsx" (Test-Path (Join-Path $root "components\kassa\cashier-workspace.tsx"))
Check "admin-workspace.tsx" (Test-Path (Join-Path $root "components\kassa\admin\admin-workspace.tsx"))
Check "kassa.css (TW scope)" (Test-Path (Join-Path $root "app\kassa\kassa.css"))
Check "print-agent" (Test-Path (Join-Path $root "print-agent\agent.js"))
Check "login redirect layout" (Test-Path (Join-Path $root "app\kassa\login\layout.tsx"))
Check "/api/auth/me kassa kind" (Select-String -Path (Join-Path $root "app\api\auth\me\route.ts") -Pattern "kind: 'kassa'" -Quiet)
Check "SessionAlivePoller kassa skip" (Select-String -Path (Join-Path $root "components\auth\SessionAlivePoller.tsx") -Pattern "/kassa" -Quiet)
Check "globals @source kassa" (Select-String -Path (Join-Path $root "app\globals.css") -Pattern "components/kassa" -Quiet)

Write-Host ""
Write-Host "API smoke test (dev server kerak)..." -ForegroundColor Cyan

$devOk = $false
foreach ($port in @(3000, 3001)) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait -and $tcp.Connected) {
            $devOk = $true
            $tcp.Close()
            if ($port -ne 3000) {
                Write-Host "  Eslatma: port $port ochiq (3000 emas). Skript avtomatik topadi." -ForegroundColor DarkYellow
            }
            break
        }
        $tcp.Close()
    } catch { }
}

if (-not $devOk) {
    Write-Host "[SKIP] Dev server ishlamayapti (3000/3001)." -ForegroundColor Yellow
    Write-Host "  Avval: npm run dev" -ForegroundColor Yellow
    Write-Host "  Keyin: npm run merge:smoke-kassa" -ForegroundColor Yellow
    $failed++
} else {
    Push-Location $root
    node scripts/merge/smoke-kassa-phase-4.mjs
    $smokeExit = $LASTEXITCODE
    Pop-Location
    if ($smokeExit -ne 0) { $failed++ }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 4 TAYYOR - brauzerda /kassa/login dan sinab ko'ring." -ForegroundColor Green
    Write-Host "Chek printer: print-agent\start.bat (ixtiyoriy)"
} else {
    Write-Host "Bosqich 4 tugallanmagan yoki dev server ishlamayapti." -ForegroundColor Yellow
    Write-Host "  npm run dev"
}
