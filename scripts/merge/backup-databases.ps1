# Bosqich 0: garmonik va garmonik_kassa bazalarini backup qilish.
# Ishlatish (PowerShell):
#   cd garmonik
#   powershell -ExecutionPolicy Bypass -File scripts/merge/backup-databases.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$backupDir = Join-Path $root "backups/merge-$(Get-Date -Format 'yyyy-MM-dd')"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

function Find-PgDump {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($ver in @("18", "17", "16", "15", "14")) {
        $candidate = "C:\Program Files\PostgreSQL\$ver\bin\pg_dump.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    return $null
}

function Read-DatabaseUrl($envPath) {
    if (-not (Test-Path $envPath)) { return $null }
    foreach ($line in Get-Content $envPath) {
        if ($line -match '^\s*DATABASE_URL\s*=\s*"?([^"#]+)"?') {
            $url = $Matches[1].Trim()
            # pg_dump query string (?schema=public) qabul qilmaydi
            if ($url -match '^([^?]+)') { return $Matches[1] }
            return $url
        }
    }
    return $null
}

$pgDump = Find-PgDump
if (-not $pgDump) {
    Write-Host "XATO: pg_dump topilmadi." -ForegroundColor Red
    Write-Host "PostgreSQL bin papkasini PATH ga qoshiring yoki pgAdmin orqali backup oling."
    Write-Host "Backup papkasi tayyor: $backupDir"
    exit 1
}

$garmonikEnv = Join-Path $root ".env.local"
$kassaEnv = Join-Path (Split-Path $root -Parent) "garmonik-kassa\.env"

$targets = @(
    @{ Name = "garmonik"; Url = (Read-DatabaseUrl $garmonikEnv); File = "garmonik.sql" },
    @{ Name = "garmonik_kassa"; Url = (Read-DatabaseUrl $kassaEnv); File = "garmonik_kassa.sql" }
)

$ok = 0
foreach ($t in $targets) {
    if (-not $t.Url) {
        $hint = if ($t.Name -eq "garmonik") { ".env.local" } else { "garmonik-kassa/.env" }
        Write-Host "Otkazildi: $($t.Name) - DATABASE_URL topilmadi ($hint)" -ForegroundColor Yellow
        continue
    }
    $out = Join-Path $backupDir $t.File
    Write-Host "Backup: $($t.Name) -> $out"
    & $pgDump $t.Url --no-owner --no-acl -f $out
    if ($LASTEXITCODE -ne 0) {
        Write-Host "XATO: $($t.Name) backup muvaffaqiyatsiz" -ForegroundColor Red
        exit 1
    }
    $ok++
}

Write-Host ""
Write-Host "Tayyor: $ok ta backup -> $backupDir" -ForegroundColor Green
