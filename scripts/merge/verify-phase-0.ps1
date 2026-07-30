# Bosqich 0 tekshiruvi
#   powershell -ExecutionPolicy Bypass -File scripts/merge/verify-phase-0.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$workspace = Split-Path $root -Parent
$failed = 0

function Check($label, $condition) {
    if ($condition) {
        Write-Host "[OK] $label" -ForegroundColor Green
    } else {
        Write-Host "[??] $label" -ForegroundColor Yellow
        $script:failed++
    }
}

Write-Host "=== Bosqich 0 tekshiruvi ===" -ForegroundColor Cyan
Write-Host ""

# Git branch
Push-Location $root
$branch = git branch --show-current 2>$null
Pop-Location
Check "Git branch: merge/kassa-into-garmonik" ($branch -eq "merge/kassa-into-garmonik")

# Baseline
Check "Baseline hujjat mavjud" (Test-Path (Join-Path $PSScriptRoot "baseline-2026-06-21.md"))
Check "PHASES.md mavjud" (Test-Path (Join-Path $PSScriptRoot "PHASES.md"))

# garmonik-kassa saqlangan
Check "garmonik-kassa papkasi mavjud" (Test-Path (Join-Path $workspace "garmonik-kassa\package.json"))

# Env fayllar
Check "garmonik/.env.local mavjud" (Test-Path (Join-Path $root ".env.local"))
Check "garmonik-kassa/.env mavjud" (Test-Path (Join-Path $workspace "garmonik-kassa\.env"))

# Backup
$backupRoot = Join-Path $root "backups"
$hasBackup = $false
if (Test-Path $backupRoot) {
    $sql = Get-ChildItem -Path $backupRoot -Recurse -Filter "*.sql" -ErrorAction SilentlyContinue
    $hasBackup = $sql.Count -ge 1
}
Check "DB backup (.sql) mavjud" $hasBackup

if (-not $hasBackup) {
    Write-Host ""
    Write-Host "Backup uchun ishga tushiring:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/merge/backup-databases.ps1"
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 0 TAYYOR - Bosqich 1 ga otish mumkin." -ForegroundColor Green
} elseif (-not $hasBackup) {
    Write-Host "Bosqich 0 deyarli tayyor - faqat DB backup qoldi." -ForegroundColor Yellow
} else {
    Write-Host "Bazi tekshiruvlar muvaffaqiyatsiz." -ForegroundColor Yellow
}
