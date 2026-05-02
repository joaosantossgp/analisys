# build_desktop.ps1
# Spike stub — Fase 1. Pipeline completo vem na Fase 4.
#
# Usage:
#   .\scripts\build_desktop.ps1
#
# Phases (Fase 4 will automate all steps):
#   1. next build (static export)
#   2. PyInstaller bundle
#   3. (Fase 4) Inno Setup installer

param(
    [switch]$SkipNextBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$WebDir = Join-Path $Root "apps\web"
$DesktopDir = Join-Path $Root "desktop"

Write-Host "=== CVM Analytics Desktop Build ===" -ForegroundColor Cyan

# Step 1 — Next.js static export
if (-not $SkipNextBuild) {
    Write-Host "`n[1/2] Building Next.js static export..." -ForegroundColor Yellow
    Push-Location $WebDir
    try {
        & node_modules\.bin\next build
        if ($LASTEXITCODE -ne 0) { throw "next build failed" }
    } finally {
        Pop-Location
    }
    Write-Host "  next build OK — output in apps/web/out/" -ForegroundColor Green
} else {
    Write-Host "`n[1/2] Skipping Next.js build (-SkipNextBuild)" -ForegroundColor Gray
}

# Step 2 — PyInstaller bundle
Write-Host "`n[2/2] Bundling with PyInstaller..." -ForegroundColor Yellow
Push-Location $Root
try {
    $specFile = Join-Path $DesktopDir "spike_app.spec"
    if (Test-Path $specFile) {
        pyinstaller $specFile --noconfirm
    } else {
        # Auto-spec for spike (single file, no static assets yet)
        pyinstaller desktop\spike_app.py `
            --onefile `
            --name CVMAnalytics-Spike `
            --noconsole `
            --add-data "src;src" `
            --hidden-import pywebview `
            --hidden-import clr_loader `
            --hidden-import pythonnet
    }
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }
} finally {
    Pop-Location
}

$exe = Get-ChildItem (Join-Path $Root "dist") -Filter "CVMAnalytics*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) {
    $sizeMB = [math]::Round($exe.Length / 1MB, 1)
    Write-Host "  Bundle OK: $($exe.FullName) ($sizeMB MB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Spike criteria check ===" -ForegroundColor Cyan
    Write-Host "  Bundle size: $sizeMB MB (target < 100 MB)" -ForegroundColor $(if ($sizeMB -lt 100) { "Green" } else { "Red" })
} else {
    Write-Host "  Could not find output .exe" -ForegroundColor Red
}
