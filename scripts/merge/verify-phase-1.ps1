# Bosqich 1 tekshiruvi
#   npm run merge:verify-phase-1

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

Write-Host "=== Bosqich 1 tekshiruvi ===" -ForegroundColor Cyan
Write-Host ""

Check "lib/kassa mavjud" (Test-Path (Join-Path $root "lib/kassa/prisma.ts"))
Check "components/kassa mavjud" (Test-Path (Join-Path $root "components/kassa/payment/payment-form.tsx"))
Check "app/kassa/login mavjud" (Test-Path (Join-Path $root "app/kassa/login/page.tsx"))
Check "app/kassa-admin mavjud" (Test-Path (Join-Path $root "app/kassa-admin/page.tsx"))
Check "app/api/kassa/invoices mavjud" (Test-Path (Join-Path $root "app/api/kassa/invoices/route.ts"))
Check "prisma/kassa/schema.prisma mavjud" (Test-Path (Join-Path $root "prisma/kassa/schema.prisma"))
Check "print-agent mavjud" (Test-Path (Join-Path $root "print-agent/agent.js"))
Check "Prisma client generatsiya" (Test-Path (Join-Path $root "node_modules/.prisma/kassa-client/index.js"))

if (-not (Test-Path (Join-Path $root "node_modules/.prisma/kassa-client/index.js"))) {
    Write-Host ""
    Write-Host "Prisma generate uchun:" -ForegroundColor Yellow
    Write-Host "  npm install"
    Write-Host "  npm run db:kassa:generate"
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "Bosqich 1 TAYYOR - npm run dev va /kassa/login ni tekshiring." -ForegroundColor Green
} else {
    Write-Host "Ba'zi tekshiruvlar muvaffaqiyatsiz - npm install && npm run db:kassa:generate" -ForegroundColor Yellow
}
