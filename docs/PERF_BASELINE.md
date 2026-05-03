# Performance Baseline

Baseline captured for task #239 on 2026-05-03 from the backend worktree.

## Validation Commands

- `python -m pytest tests -q` -> 160 passed
- `python -m pytest apps/api/tests -q` -> 97 passed
- `python scripts/perf_guardrail.py check --baseline docs/perf/performance_baseline.json --report perf-guardrail-report.json` -> PASS
- `.\desktop\build_desktop.ps1 -SkipNextBuild` -> `dist/CVMAnalytics`, total size ~88 MB

## API Guardrail Snapshot

| Endpoint | Median ms | P95 ms |
|---|---:|---:|
| `GET /companies` | 3.84 | 4.56 |
| `GET /companies/filters` | 27.22 | 27.80 |
| `GET /companies/suggestions?q=emp` | 4.22 | 5.31 |
| `GET /companies/1000` | 4.31 | 4.61 |
| `GET /companies/1000/years` | 4.12 | 4.63 |
| `GET /companies/1000/statements?stmt=DRE&years=2023,2024` | 11.46 | 11.73 |
| `GET /companies/1000/kpis?years=2023,2024` | 25.63 | 27.46 |
| `GET /sectors` | 93.67 | 141.89 |
| `GET /sectors/energia` | 71.74 | 72.38 |

## Desktop Bundle

- Bundle path: `dist/CVMAnalytics`
- Bundle size after excluding dashboard-only and optional scientific packages: ~88 MB
- Packaged public MP4 assets are removed from the desktop copy only; source assets remain unchanged.

## Cold Start Probe

Measured by monkeypatching `webview.create_window` and `webview.start` while running `desktop.app.main()` against the generated standalone server:

- `desktop_start_seconds=0.722`
- The probe covers Python startup plus standalone Next server readiness, without opening a GUI window.
