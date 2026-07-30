# Bosqich 2 tekshiruvi
#   npm run merge:verify-phase-2

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

Write-Host "=== Bosqich 2 tekshiruvi ===" -ForegroundColor Cyan
Write-Host ""

$envFile = Join-Path $root ".env.local"
$dbUrl = $null
$kassaUrl = $null
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*DATABASE_URL\s*=\s*"?([^"#]+)"?') {
            $dbUrl = $Matches[1].Trim()
        }
        if ($line -match '^\s*KASSA_DATABASE_URL\s*=\s*"?([^"#]+)"?') {
            $kassaUrl = $Matches[1].Trim()
        }
    }
}

Check "DATABASE_URL mavjud" ($null -ne $dbUrl)
if ($kassaUrl) {
    $same = ($dbUrl -eq $kassaUrl)
    Check "KASSA_DATABASE_URL = DATABASE_URL (bitta baza)" $same
} else {
    Check "KASSA_DATABASE_URL = DATABASE_URL (bitta baza)" $true
}

$pgDump = $null
foreach ($ver in @("18", "17", "16", "15")) {
    $candidate = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
    if (Test-Path $candidate) { $pgDump = $candidate; break }
}

if ($pgDump -and $dbUrl) {
    $schemaExists = & $pgDump $dbUrl -tAc "select 1 from information_schema.schemata where schema_name='kassa'" 2>$null
    Check "kassa schema mavjud" ($schemaExists -eq "1")

    $users = & $pgDump $dbUrl -tAc "select count(*)::text from kassa.users" 2>$null
    Check "kassa.users ma'lumot bor" ([int]$users -gt 0)

    $col = & $pgDump $dbUrl -tAc "select 1 from information_schema.columns where table_schema='kassa' and table_name='patients' and column_name='garmonik_patient_id'" 2>$null
    Check "kassa.patients.garmonik_patient_id ustuni" ($col -eq "1")
} else {
    Write-Host "[??] psql topilmadi yoki DATABASE_URL yoq - DB tekshiruvi otkazildi" -ForegroundColor Yellow
    $failed++
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 2 TAYYOR - npm run db:kassa:check-login" -ForegroundColor Green
} else {
    Write-Host "Bosqich 2 tugallanmagan: npm run merge:phase-2" -ForegroundColor Yellow
}
