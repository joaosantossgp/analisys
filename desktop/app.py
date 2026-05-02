"""
CVM Analytics — entry point pywebview.

Uso:
  python -m desktop.app --dev    # Next.js dev server em :3000 + FastAPI em :8000
  python -m desktop.app          # standalone server em .next/standalone/server.js
  python -m desktop.app --debug  # abre DevTools no modo que estiver ativo
"""

from __future__ import annotations

import socket
import subprocess
import sys
import time
from pathlib import Path

import webview

from desktop.bridge import CVMBridge

_DEV_URL = "http://localhost:3000"
_STANDALONE = Path(__file__).parent.parent / "apps" / "web" / ".next" / "standalone" / "server.js"
_STATIC_DIR = Path(__file__).parent.parent / "apps" / "web" / ".next" / "standalone"
_WIDTH, _HEIGHT = 1280, 820
_BG = "#0a0a0a"
_STARTUP_TIMEOUT = 10  # seconds to wait for the standalone server to be ready


def _free_port() -> int:
    """Devolve uma porta TCP livre em 127.0.0.1."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait_for_port(port: int, timeout: float = _STARTUP_TIMEOUT) -> bool:
    """Aguarda até o servidor responder em 127.0.0.1:<port>."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def _start_standalone_server() -> tuple[subprocess.Popen[bytes], int]:
    """
    Inicia .next/standalone/server.js em uma porta aleatória.
    Retorna (processo, porta).
    """
    port = _free_port()
    proc = subprocess.Popen(
        ["node", str(_STANDALONE)],
        env={
            **__import__("os").environ,
            "PORT": str(port),
            "HOSTNAME": "127.0.0.1",
        },
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
        url = _DEV_URL
    else:
        if not _STANDALONE.exists():
            sys.exit(
                f"[desktop] Standalone server não encontrado em {_STANDALONE}.\n"
                "Execute primeiro:\n"
                "  npm --prefix apps/web run build\n"
                "O build gera .next/standalone/server.js automaticamente."
            )
        server_proc, port = _start_standalone_server()
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
    webview.start(debug=debug_mode)

    if server_proc is not None:
        server_proc.terminate()


if __name__ == "__main__":
    main()
