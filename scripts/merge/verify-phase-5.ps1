# Bosqich 5 tekshiruvi
#   npm run merge:verify-phase-5

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

Write-Host "=== Bosqich 5 tekshiruvi (bemor bog'lanish) ===" -ForegroundColor Cyan
Write-Host ""

Check "patient-bridge.ts" (Test-Path (Join-Path $root "lib\kassa\patient-bridge.ts"))
Check "patients/search API" (Test-Path (Join-Path $root "app\api\kassa\patients\search\route.ts"))
Check "patient-lookup-field.tsx" (Test-Path (Join-Path $root "components\kassa\payment\patient-lookup-field.tsx"))
Check "db: searchPatientsForKassa" (Select-String -Path (Join-Path $root "lib\db\patients.ts") -Pattern "searchPatientsForKassa" -Quiet)
Check "patients POST sync" (Select-String -Path (Join-Path $root "app\api\patients\route.ts") -Pattern "ensureKassaPatientForGarmonik" -Quiet)
Check "invoice: resolveKassaPatient" (Select-String -Path (Join-Path $root "app\api\kassa\invoices\route.ts") -Pattern "resolveKassaPatientForInvoice" -Quiet)
Check "phase-5 sync script" (Test-Path (Join-Path $root "scripts\merge\phase-5-sync-patients.mjs"))

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
            break
        }
        $tcp.Close()
    } catch { }
}

if (-not $devOk) {
    Write-Host "[SKIP] Dev server ishlamayapti. npm run dev" -ForegroundColor Yellow
    $failed++
} else {
    Push-Location $root
    node scripts/merge/smoke-kassa-phase-5.mjs
    if ($LASTEXITCODE -ne 0) { $failed++ }
    Pop-Location
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 5 TAYYOR." -ForegroundColor Green
    Write-Host "Kabinetda yangi karta oching, kassada KB-... bilan qidiring."
} else {
    Write-Host "Ba'zi tekshiruvlar muvaffaqiyatsiz." -ForegroundColor Yellow
}
