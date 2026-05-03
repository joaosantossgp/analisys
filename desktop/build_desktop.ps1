# build_desktop.ps1
# Gera a pasta distribuível dist/CVMAnalytics/ com CVMAnalytics.exe.
#
# Uso:
#   .\desktop\build_desktop.ps1
#   .\desktop\build_desktop.ps1 -SkipNextBuild   # pula o next build (UI nao mudou)
#   .\desktop\build_desktop.ps1 -Verbose
#
# Saída:
#   dist/CVMAnalytics/CVMAnalytics.exe   — clique para abrir o app
#
# Requisitos:
#   - Python com pyinstaller, pywebview instalados  (pip install -r requirements.txt)
#   - Node.js instalado (node no PATH)
#   - npm instalado

param(
    [switch]$SkipNextBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$Root    = Split-Path $PSScriptRoot -Parent
$WebDir  = Join-Path $Root "apps\web"
$DesktopDir = $PSScriptRoot

Write-Host ""
Write-Host "=== CVM Analytics Desktop Build ===" -ForegroundColor Cyan
Write-Host "  Root: $Root"
Write-Host ""

# ---------------------------------------------------------------------------
# Passo 1 — Next.js standalone build
# ---------------------------------------------------------------------------
if (-not $SkipNextBuild) {
    Write-Host "[1/4] next build (output: standalone)..." -ForegroundColor Yellow
    Push-Location $WebDir
    try {
        & node_modules\.bin\next build
        if ($LASTEXITCODE -ne 0) { throw "next build falhou (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
    Write-Host "  OK: .next/standalone/ gerado" -ForegroundColor Green
} else {
    Write-Host "[1/4] Pulando next build (-SkipNextBuild)" -ForegroundColor Gray
}

# ---------------------------------------------------------------------------
# Passo 2 — Copiar public/ e .next/static/ para dentro de standalone/
# (Next.js nao copia esses assets automaticamente no standalone output)
# ---------------------------------------------------------------------------
Write-Host "[2/4] Copiando assets estaticos para standalone/..." -ForegroundColor Yellow

$StandaloneDir = Join-Path $WebDir ".next\standalone"
$PublicSrc     = Join-Path $WebDir "public"
$StaticSrc     = Join-Path $WebDir ".next\static"
$PublicDst     = Join-Path $StandaloneDir "public"
$StaticDst     = Join-Path $StandaloneDir ".next\static"

if (-not (Test-Path $StandaloneDir)) {
    throw "standalone/ nao encontrado em $StandaloneDir. Execute o next build primeiro."
}
if (Test-Path $PublicSrc) {
    Copy-Item -Recurse -Force $PublicSrc $PublicDst
    Get-ChildItem $PublicDst -Recurse -Include *.mp4 -ErrorAction SilentlyContinue | Remove-Item -Force
    Write-Host "  OK: public/ copiado" -ForegroundColor Green
} else {
    Write-Host "  (sem public/ para copiar)" -ForegroundColor Gray
}
if (Test-Path $StaticSrc) {
    if (-not (Test-Path (Split-Path $StaticDst -Parent))) {
        New-Item -ItemType Directory -Force (Split-Path $StaticDst -Parent) | Out-Null
    }
    Copy-Item -Recurse -Force $StaticSrc $StaticDst
    Write-Host "  OK: .next/static/ copiado" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Passo 3 — Preparar node.exe portátil
# Copia o node.exe do sistema para desktop/node_portable/
# (PyInstaller inclui esse arquivo no bundle via app.spec)
# ---------------------------------------------------------------------------
Write-Host "[3/4] Preparando node.exe portátil..." -ForegroundColor Yellow

$NodePortableDir = Join-Path $DesktopDir "node_portable"
$NodePortableExe = Join-Path $NodePortableDir "node.exe"

if (-not (Test-Path $NodePortableExe)) {
    $NodeSys = (Get-Command node -ErrorAction SilentlyContinue)
    if (-not $NodeSys) {
        throw "node nao encontrado no PATH. Instale o Node.js em https://nodejs.org"
    }
    New-Item -ItemType Directory -Force $NodePortableDir | Out-Null
    Copy-Item $NodeSys.Source $NodePortableExe
    Write-Host "  OK: node.exe copiado de $($NodeSys.Source)" -ForegroundColor Green
} else {
    Write-Host "  OK: node_portable/node.exe ja existe" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Passo 4 — PyInstaller
# ---------------------------------------------------------------------------
Write-Host "[4/4] PyInstaller bundle..." -ForegroundColor Yellow

$SpecFile = Join-Path $DesktopDir "app.spec"
if (-not (Test-Path $SpecFile)) {
    throw "app.spec nao encontrado em $SpecFile"
}

Push-Location $Root
try {
    $pyArgs = @($SpecFile, "--noconfirm")
    if ($Verbose) { $pyArgs += "--log-level=INFO" }
    pyinstaller @pyArgs
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller falhou (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# Resultado
# ---------------------------------------------------------------------------
$ExePath  = Join-Path $Root "dist\CVMAnalytics\CVMAnalytics.exe"
$DistDir  = Join-Path $Root "dist\CVMAnalytics"

if (Test-Path $ExePath) {
    $SizeMB = [math]::Round((Get-ChildItem $DistDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 0)
    Write-Host ""
    Write-Host "=== Build concluído ===" -ForegroundColor Green
    Write-Host "  Pasta:  $DistDir"
    Write-Host "  Exe:    $ExePath"
    Write-Host "  Tamanho total: ~$SizeMB MB"
    Write-Host ""
    Write-Host "Para abrir: clique duas vezes em CVMAnalytics.exe" -ForegroundColor Cyan
    Write-Host "Ou via terminal: & '$ExePath'"
} else {
    Write-Host ""
    Write-Host "ERRO: CVMAnalytics.exe nao encontrado em $ExePath" -ForegroundColor Red
    exit 1
}
