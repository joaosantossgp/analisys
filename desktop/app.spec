# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec para CVM Analytics Desktop (Opção A — pasta distribuível).
#
# Pré-requisitos antes de rodar este spec:
#   1. npm --prefix apps/web run build   (gera .next/standalone/)
#   2. Copiar public/ e .next/static/ para dentro de standalone/ (feito pelo build_desktop.ps1)
#   3. Ter desktop/node_portable/node.exe disponível (copiado pelo build_desktop.ps1)
#
# Uso: pyinstaller desktop/app.spec --noconfirm
# Saída: dist/CVMAnalytics/CVMAnalytics.exe

from pathlib import Path

ROOT = Path(SPECPATH).parent  # repo root (spec está em desktop/, ROOT é um nível acima)
STANDALONE_DIR = ROOT / "apps" / "web" / ".next" / "standalone"
NODE_EXE = ROOT / "desktop" / "node_portable" / "node.exe"
UPDATE_HELPER = ROOT / "desktop" / "update_helper.ps1"

datas = []

if STANDALONE_DIR.exists():
    datas.append((str(STANDALONE_DIR), "web_standalone"))

if NODE_EXE.exists():
    datas.append((str(NODE_EXE), "."))

# Bundled PowerShell helper used by the auto-updater to swap files after exit.
datas.append((str(UPDATE_HELPER), "."))

a = Analysis(
    [str(ROOT / "desktop" / "app.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        # pywebview backends (Windows usa EdgeChromium / WinForms)
        "webview",
        "webview.platforms.winforms",
        "webview.platforms.edgechromium",
        # bridge e deps lazy-importadas
        "desktop.bridge",
        "src.read_service",
        "src.db",
        # clr/pythonnet necessário para pywebview no Windows
        "clr_loader",
        "pythonnet",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # excluir tooling que não vai ao runtime
        "pytest",
        "IPython",
        "matplotlib",
        "tkinter",
        "streamlit",
        "plotly",
        "altair",
        "pyarrow",
        "polars",
        "_polars_runtime_32",
        "PIL",
        "lxml",
        "psycopg2",
        "yfinance",
        "curl_cffi",
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,  # --onedir: binários ficam na pasta, não embutidos no exe
    name="CVMAnalytics",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # sem janela de console
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # TODO: adicionar ícone .ico em Fase 5
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="CVMAnalytics",
)
