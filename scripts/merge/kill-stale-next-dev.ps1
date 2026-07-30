# Eski Next.js dev serverni toxtatish (port 3000/3001)
#   npm run dev:kill-stale

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$killed = 0

foreach ($port in @(3000, 3001)) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        if (-not $procId) { continue }
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if (-not $proc) { continue }
        Write-Host "Port $port : PID $procId ($($proc.ProcessName)) toxtatilmoqda..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        $killed++
    }
}

$lock = Join-Path $root ".next\dev\lock"
if (Test-Path $lock) {
    Remove-Item $lock -Force -ErrorAction SilentlyContinue
    Write-Host "Lock fayl o'chirildi: .next\dev\lock"
}

if ($killed -eq 0) {
    Write-Host "Eski dev server topilmadi. npm run dev ni xavfsiz ishga tushiring."
} else {
    Write-Host "$killed ta jarayon toxtatildi. Endi: npm run dev"
}
