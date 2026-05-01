"""
Spike Fase 1 — Pywebview + bridge Python + HTML de teste.

Objetivo: validar que a arquitetura desktop funciona antes de migrar
a UI Next.js completa. Não usa o Next.js — apenas HTML embutido.

Critérios a medir:
- Boot até janela aberta < 3 s
- Latência bridge (JS → Python → DB → JS) < 5 ms p99
- Bundle PyInstaller < 100 MB (medido separadamente)
"""

from __future__ import annotations

import dataclasses
import json
import sys
import time

import webview


# HTML de teste embutido — nenhum asset externo necessário.
SPIKE_HTML = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>CVM Analytics — Spike Desktop</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a; color: #e5e5e5;
      display: flex; flex-direction: column;
      align-items: center; padding: 40px 20px;
      min-height: 100vh;
    }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 8px; }
    p.subtitle { color: #888; font-size: 0.875rem; margin-bottom: 32px; }
    button {
      background: #2563eb; color: white; border: none; border-radius: 8px;
      padding: 10px 24px; font-size: 0.95rem; cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #1d4ed8; }
    button:disabled { background: #374151; cursor: default; }
    #stats {
      margin-top: 20px; font-size: 0.8rem; color: #6b7280;
      font-family: monospace;
    }
    #result {
      margin-top: 24px; width: 100%; max-width: 800px;
      background: #111; border: 1px solid #222; border-radius: 8px;
      padding: 16px; font-size: 0.8rem; font-family: monospace;
      max-height: 400px; overflow-y: auto; color: #a3e635;
    }
    .company-row {
      padding: 6px 0; border-bottom: 1px solid #1e1e1e; color: #e5e5e5;
    }
    .company-row:last-child { border-bottom: none; }
    .ticker { color: #60a5fa; font-weight: 600; margin-right: 8px; }
    .sector { color: #888; font-size: 0.75rem; margin-left: 8px; }
    .error { color: #f87171; }
  </style>
</head>
<body>
  <h1>CVM Analytics — Desktop Spike</h1>
  <p class="subtitle">Fase 1: validação de bridge Python ↔ JS via Pywebview</p>

  <button id="btn" onclick="loadCompanies()">Carregar empresas (bridge)</button>
  <div id="stats"></div>
  <div id="result" style="display:none"></div>

  <script>
    async function loadCompanies() {
      const btn = document.getElementById('btn');
      const stats = document.getElementById('stats');
      const result = document.getElementById('result');

      btn.disabled = true;
      btn.textContent = 'Carregando...';
      stats.textContent = '';
      result.style.display = 'none';

      const t0 = performance.now();
      let data;
      try {
        data = await window.pywebview.api.get_companies({ page: 1, page_size: 20 });
      } catch (err) {
        stats.textContent = 'Erro: ' + String(err);
        btn.disabled = false;
        btn.textContent = 'Tentar novamente';
        return;
      }
      const elapsed = (performance.now() - t0).toFixed(2);

      if (data.error) {
        stats.textContent = 'Erro do bridge: ' + data.error;
        result.innerHTML = '<span class="error">' + data.error + '</span>';
        result.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Tentar novamente';
        return;
      }

      const items = data.items || [];
      const pagination = data.pagination || {};

      stats.textContent =
        `Bridge latency: ${elapsed} ms | ` +
        `${items.length} empresas (${pagination.total_items || '?'} total, ` +
        `página ${pagination.page}/${pagination.total_pages})`;

      result.innerHTML = items.length === 0
        ? '<span style="color:#888">Nenhuma empresa no banco. Rode o scraper primeiro.</span>'
        : items.map(c =>
            `<div class="company-row">` +
            `<span class="ticker">${c.ticker_b3 || '—'}</span>` +
            `${c.company_name}` +
            `<span class="sector">${c.sector_name || ''}</span>` +
            `</div>`
          ).join('');
      result.style.display = 'block';

      btn.disabled = false;
      btn.textContent = 'Recarregar';
    }

    // Auto-load on bridge ready
    window.addEventListener('pywebviewready', loadCompanies);
  </script>
</body>
</html>
"""


class CVMBridge:
    """Funções Python expostas ao JS via window.pywebview.api.*"""

    def __init__(self) -> None:
        self._service = None

    def _get_service(self):
        if self._service is None:
            # Import lazy para não atrasar o boot da janela
            from src.read_service import CVMReadService  # noqa: PLC0415
            self._service = CVMReadService()
        return self._service

    def get_companies(self, params=None) -> dict:
        # pywebview passes JS objects as a single dict positional arg
        if params is None:
            params = {}
        page = int(params.get("page", 1))
        page_size = int(params.get("page_size", 20))
        search = str(params.get("search", ""))
        sector_slug = params.get("sector_slug") or None

        t0 = time.perf_counter()
        try:
            svc = self._get_service()
            result = svc.list_companies(
                search=search,
                sector_slug=sector_slug,
                page=page,
                page_size=page_size,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000
            payload = dataclasses.asdict(result)
            payload["_bridge_ms"] = round(elapsed_ms, 3)
            return payload
        except Exception as exc:
            return {"error": str(exc), "items": [], "pagination": {}}

    def ping(self) -> dict:
        return {"pong": True, "ts": time.time()}


def main() -> None:
    t_boot = time.perf_counter()

    bridge = CVMBridge()
    window = webview.create_window(
        title="CVM Analytics",
        html=SPIKE_HTML,
        js_api=bridge,
        width=960,
        height=700,
        resizable=True,
        background_color="#0a0a0a",
    )

    def on_loaded():
        elapsed = (time.perf_counter() - t_boot) * 1000
        print(f"[spike] janela carregada em {elapsed:.0f} ms", flush=True)

    window.events.loaded += on_loaded

    webview.start(debug="--debug" in sys.argv)


if __name__ == "__main__":
    main()
