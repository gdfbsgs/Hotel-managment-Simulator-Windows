# ArchHotel Simulator - Windows PowerShell Launcher
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   ArchHotel 3D Tycoon - Windows Edition" -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] Node.js is not installed." -ForegroundColor Red
    Write-Host "  Download from https://nodejs.org/" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}

$nodeVersion = (node -v) -replace '^v', ''
$major = [int]($nodeVersion.Split('.')[0])
if ($major -lt 18) {
    Write-Host "  [ERROR] Node.js 18+ required. Found: $(node -v)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies (first run only)..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ""
}

if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "  Created .env.local - add GEMINI_API_KEY for AI features." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "  Starting server at http://localhost:3000" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

npm run dev
