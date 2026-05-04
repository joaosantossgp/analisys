"""
CVM Analytics — entry point pywebview.

Uso:
  python -m desktop.app --dev    # inicia/reusa Next.js dev server em :3000
  python -m desktop.app          # standalone server em .next/standalone/server.js
  python -m desktop.app --debug  # abre DevTools no modo que estiver ativo

Quando empacotado via PyInstaller (sys.frozen=True):
  - server.js lido de sys._MEIPASS/web_standalone/server.js
  - node.exe lido de sys._MEIPASS/node.exe (copiado pelo build_desktop.ps1)
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import webview

from desktop.bridge import CVMBridge

_DEV_PORT = 3000
_DEV_URL = f"http://127.0.0.1:{_DEV_PORT}"
_WIDTH, _HEIGHT = 1280, 820
_BG = "#0a0a0a"
_STARTUP_TIMEOUT = 15  # segundos — bundle pode demorar mais no primeiro boot


def _bundled() -> bool:
    return getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS")


def _bundle_dir() -> Path:
    return Path(sys._MEIPASS)  # type: ignore[attr-defined]


def _repo_root() -> Path:
    return Path(__file__).parent.parent


def _web_dir() -> Path:
    return _repo_root() / "apps" / "web"


def _standalone_path() -> Path:
    if _bundled():
        return _bundle_dir() / "web_standalone" / "server.js"
    return _web_dir() / ".next" / "standalone" / "server.js"


def _node_exe() -> str:
    """Retorna o caminho do node a usar: bundled primeiro, depois PATH."""
    if _bundled():
        node = _bundle_dir() / "node.exe"
        if node.exists():
            return str(node)
    return "node"


def _npm_cmd() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.5):
            return True
    except OSError:
        return False


def _wait_for_port(port: int, timeout: float = _STARTUP_TIMEOUT) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if _port_open(port):
            return True
        time.sleep(0.2)
    return False


def _start_dev_server() -> tuple[subprocess.Popen[bytes], int]:
    web_dir = _web_dir()
    if not (web_dir / "package.json").exists():
        sys.exit(f"[desktop] Web app nao encontrado em {web_dir}.")

    proc = subprocess.Popen(
        [
            _npm_cmd(),
            "run",
            "dev",
            "--",
            "--hostname",
            "127.0.0.1",
            "--port",
            str(_DEV_PORT),
        ],
        cwd=str(web_dir),
        env={**os.environ, "BROWSER": "none"},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc, _DEV_PORT


def _start_standalone_server(standalone: Path) -> tuple[subprocess.Popen[bytes], int]:
    port = _free_port()
    proc = subprocess.Popen(
        [_node_exe(), str(standalone)],
        env={**os.environ, "PORT": str(port), "HOSTNAME": "127.0.0.1"},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return proc, port


def main() -> None:
    args = sys.argv[1:]
    dev_mode = "--dev" in args
    debug_mode = "--debug" in args

    bridge = CVMBridge()
    server_proc: subprocess.Popen[bytes] | None = None

    if dev_mode:
        if _port_open(_DEV_PORT):
            url = _DEV_URL
        else:
            server_proc, port = _start_dev_server()
            if not _wait_for_port(port, timeout=30):
                server_proc.terminate()
                sys.exit(
                    f"[desktop] Next.js dev server nao respondeu na porta {port} "
                    "apos 30s."
                )
            url = _DEV_URL
    else:
        standalone = _standalone_path()
        if not standalone.exists():
            sys.exit(
                f"[desktop] Standalone server não encontrado em {standalone}.\n"
                "Execute primeiro:\n"
                "  .\\desktop\\build_desktop.ps1\n"
                "(ou: npm --prefix apps/web run build)"
            )
        server_proc, port = _start_standalone_server(standalone)
        if not _wait_for_port(port):
            server_proc.terminate()
            sys.exit(
                f"[desktop] Servidor standalone não respondeu na porta {port} "
                f"após {_STARTUP_TIMEOUT}s."
            )
        url = f"http://127.0.0.1:{port}"

    webview.create_window(
        "CVM Analytics",
        url=url,
        js_api=bridge,
        width=_WIDTH,
        height=_HEIGHT,
        background_color=_BG,
        min_size=(800, 600),
    )

    threading.Thread(
        target=bridge._start_update_check,
        name="desktop-update-check",
        daemon=True,
    ).start()

    webview.start(debug=debug_mode)

    if server_proc is not None:
        server_proc.terminate()


if __name__ == "__main__":
    main()
