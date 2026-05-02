"""
CVM Analytics — entry point pywebview.

Uso:
  python -m desktop.app --dev    # Next.js dev server em :3000 + FastAPI em :8000
  python -m desktop.app          # static export em apps/web/out/
  python -m desktop.app --debug  # abre DevTools no modo que estiver ativo
"""

from __future__ import annotations

import functools
import http.server
import socket
import sys
import threading
from pathlib import Path

import webview

from desktop.bridge import CVMBridge

_DEV_URL = "http://localhost:3000"
_OUT_DIR = Path(__file__).parent.parent / "apps" / "web" / "out"
_WIDTH, _HEIGHT = 1280, 820
_BG = "#0a0a0a"


class _SPAHandler(http.server.SimpleHTTPRequestHandler):
    """Serve apps/web/out/ com fallback para index.html (SPA client-side routing)."""

    def do_GET(self) -> None:
        candidate = Path(self.directory) / self.path.lstrip("/")
        if not candidate.exists() or candidate.is_dir():
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, *_args: object) -> None:
        pass  # silencia logs do servidor embutido


def _start_spa_server(directory: Path) -> int:
    """Sobe HTTPServer numa porta aleatória e retorna o número da porta."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port: int = sock.getsockname()[1]
    sock.close()

    handler = functools.partial(_SPAHandler, directory=str(directory))
    server = http.server.HTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return port


def main() -> None:
    args = sys.argv[1:]
    dev_mode = "--dev" in args
    debug_mode = "--debug" in args

    bridge = CVMBridge()

    if dev_mode:
        url = _DEV_URL
    else:
        index = _OUT_DIR / "index.html"
        if not index.exists():
            sys.exit(
                f"[desktop] Static export não encontrado em {_OUT_DIR}.\n"
                "Execute primeiro:\n"
                "  $env:NEXT_DESKTOP_BUILD = 'true'\n"
                "  npm --prefix apps/web run build"
            )
        port = _start_spa_server(_OUT_DIR)
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


if __name__ == "__main__":
    main()
