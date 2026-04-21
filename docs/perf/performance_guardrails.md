# Performance Guardrails

Issue: `#138`
Owner lane: `ops-quality`

This repository now keeps a lightweight, repeatable baseline for:

- main product web routes:
  `/`, `/empresas`, `/empresas/[cd_cvm]`, `/comparar`, `/setores`, `/setores/[slug]`
- hot API endpoints behind those routes:
  `/companies`, `/companies/filters`, `/companies/suggestions`, `/companies/{cd_cvm}`,
  `/companies/{cd_cvm}/years`, `/companies/{cd_cvm}/statements`,
  `/companies/{cd_cvm}/kpis`, `/sectors`, `/sectors/{slug}`

## What is measured

### Web

- rendering mode from `next build` (`static` vs `dynamic`)
- `revalidate_seconds` from `.next/prerender-manifest.json`
- `first_load_uncompressed_js_bytes` per route from `.next/diagnostics/route-bundle-stats.json`

### API

- in-process HTTP latency against a synthetic 449-company SQLite dataset
- median and p95 for the hot endpoints listed above

The API harness is intentionally synthetic and local. It is good for regression detection inside CI, not for production SLO claims.

## Source of truth

- Baseline + budgets: [performance_baseline.json](./performance_baseline.json)
- Collector/checker: [`scripts/perf_guardrail.py`](../../scripts/perf_guardrail.py)
- Existing deeper query benchmark: [benchmark_read_paths.md](./benchmark_read_paths.md)

## How to run locally

From the repo root:

```powershell
python -m pip install -r requirements.txt
python -m pip install -r apps/api/requirements-dev.txt
npm ci --prefix apps/web
python scripts/perf_guardrail.py check --baseline docs/perf/performance_baseline.json
```

To refresh the baseline after an intentional performance change:

```powershell
python scripts/perf_guardrail.py capture --output docs/perf/performance_baseline.json
```

## Guardrail policy

- Rendering mode changes are blocked unless the baseline is updated intentionally.
- Revalidate changes for static routes are blocked unless the baseline is updated intentionally.
- Web bundle growth is allowed only up to the per-route ceiling stored in the baseline JSON.
- API latency is allowed only up to the per-endpoint `max_median_ms` and `max_p95_ms` ceilings stored in the baseline JSON.

These budgets are intentionally light. They are meant to catch meaningful regressions, not micro-variations.

## When to refresh the baseline

Refresh `docs/perf/performance_baseline.json` only when:

- a route intentionally changes rendering mode
- a static route intentionally changes `revalidate`
- a deliberate product change legitimately increases route JS
- an approved backend change legitimately shifts the hot endpoint latency envelope

If the baseline is refreshed, include the reason in the PR body and update issue evidence.
