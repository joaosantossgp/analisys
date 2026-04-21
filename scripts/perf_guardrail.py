#!/usr/bin/env python3
"""
Repeatable performance snapshot + guardrail checks for the main web routes and API endpoints.

Usage:
    python scripts/perf_guardrail.py capture --output docs/perf/performance_baseline.json
    python scripts/perf_guardrail.py check --baseline docs/perf/performance_baseline.json
"""
from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import statistics
import subprocess
import sys
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from apps.api.app.main import create_app  # noqa: E402
from scripts.benchmark_read_paths import (  # noqa: E402
    ANNUAL_YEARS,
    N_COMPANIES,
    seed_synthetic_benchmark_data,
)
from src.database import init_db_tables  # noqa: E402
from src.read_service import CVMReadService  # noqa: E402
from src.settings import build_settings  # noqa: E402

WEB_APP_DIR = ROOT / "apps" / "web"
DEFAULT_BASELINE_PATH = ROOT / "docs" / "perf" / "performance_baseline.json"
TARGET_WEB_ROUTES = (
    "/",
    "/empresas",
    "/empresas/[cd_cvm]",
    "/comparar",
    "/setores",
    "/setores/[slug]",
)
API_ENDPOINT_SPECS = (
    {
        "id": "GET /companies",
        "method": "GET",
        "path": "/companies",
        "params": {},
    },
    {
        "id": "GET /companies/filters",
        "method": "GET",
        "path": "/companies/filters",
        "params": {},
    },
    {
        "id": "GET /companies/suggestions?q=emp",
        "method": "GET",
        "path": "/companies/suggestions",
        "params": {"q": "emp"},
    },
    {
        "id": "GET /companies/1000",
        "method": "GET",
        "path": "/companies/1000",
        "params": {},
    },
    {
        "id": "GET /companies/1000/years",
        "method": "GET",
        "path": "/companies/1000/years",
        "params": {},
    },
    {
        "id": "GET /companies/1000/statements?stmt=DRE&years=2023,2024",
        "method": "GET",
        "path": "/companies/1000/statements",
        "params": {"stmt": "DRE", "years": "2023,2024"},
    },
    {
        "id": "GET /companies/1000/kpis?years=2023,2024",
        "method": "GET",
        "path": "/companies/1000/kpis",
        "params": {"years": "2023,2024"},
    },
    {
        "id": "GET /sectors",
        "method": "GET",
        "path": "/sectors",
        "params": {},
    },
    {
        "id": "GET /sectors/energia",
        "method": "GET",
        "path": "/sectors/energia",
        "params": {},
    },
)


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _run(command: list[str], *, cwd: Path) -> subprocess.CompletedProcess[str]:
    executable = command[0]
    if os.name == "nt" and not executable.lower().endswith(".cmd"):
        executable = f"{executable}.cmd"
    resolved = shutil.which(executable) or shutil.which(command[0]) or executable
    completed = subprocess.run(
        [resolved, *command[1:]],
        cwd=str(cwd),
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({' '.join(command)}) in {cwd}\n"
            f"stdout:\n{completed.stdout}\n"
            f"stderr:\n{completed.stderr}"
        )
    return completed


def _parse_route_table(build_stdout: str) -> dict[str, dict[str, Any]]:
    route_prefixes = {"\u250c", "\u251c", "\u2514"}
    static_symbol = "\u25cb"
    dynamic_symbol = "\u0192"
    table: dict[str, dict[str, Any]] = {}
    for raw_line in build_stdout.splitlines():
        line = raw_line.rstrip()
        if not line or line[:1] not in route_prefixes:
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        symbol = parts[1]
        route = parts[2]
        if not route.startswith("/"):
            continue
        if symbol not in {static_symbol, dynamic_symbol}:
            continue
        table[route] = {
            "rendering_mode": "static" if symbol == static_symbol else "dynamic",
        }
    return table


def _json_load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def collect_web_snapshot() -> dict[str, Any]:
    build = _run(["npm", "run", "build"], cwd=WEB_APP_DIR)
    route_table = _parse_route_table(build.stdout)
    bundle_stats = {
        item["route"]: item
        for item in _json_load(WEB_APP_DIR / ".next" / "diagnostics" / "route-bundle-stats.json")
    }
    prerender_manifest = _json_load(WEB_APP_DIR / ".next" / "prerender-manifest.json")
    framework = _json_load(WEB_APP_DIR / ".next" / "diagnostics" / "framework.json")

    routes: dict[str, Any] = {}
    for route in TARGET_WEB_ROUTES:
        if route not in route_table:
            raise RuntimeError(f"Route {route} not found in next build output.")
        if route not in bundle_stats:
            raise RuntimeError(f"Route {route} not found in route-bundle-stats.json.")
        prerender = prerender_manifest.get("routes", {}).get(route, {})
        routes[route] = {
            "rendering_mode": route_table[route]["rendering_mode"],
            "revalidate_seconds": prerender.get("initialRevalidateSeconds"),
            "first_load_uncompressed_js_bytes": int(
                bundle_stats[route]["firstLoadUncompressedJsBytes"]
            ),
            "first_load_chunk_count": len(bundle_stats[route]["firstLoadChunkPaths"]),
        }

    return {
        "framework": framework,
        "routes": routes,
    }


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        raise ValueError("Cannot compute percentile for empty sample.")
    sorted_values = sorted(values)
    index = max(0, min(len(sorted_values) - 1, math.ceil(len(sorted_values) * percentile) - 1))
    return float(sorted_values[index])


def _time_request(
    client: TestClient,
    *,
    method: str,
    path: str,
    params: dict[str, str],
    runs: int,
    warmups: int,
) -> dict[str, float]:
    for _ in range(warmups):
        response = client.request(method, path, params=params)
        if response.status_code != 200:
            raise RuntimeError(f"Warmup failed for {method} {path}: status={response.status_code}")

    timings: list[float] = []
    for _ in range(runs):
        started_at = time.perf_counter()
        response = client.request(method, path, params=params)
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        if response.status_code != 200:
            raise RuntimeError(f"Benchmark failed for {method} {path}: status={response.status_code}")
        timings.append(elapsed_ms)

    return {
        "median_ms": round(statistics.median(timings), 2),
        "p95_ms": round(_percentile(timings, 0.95), 2),
        "min_ms": round(min(timings), 2),
        "max_ms": round(max(timings), 2),
    }


def collect_api_snapshot(*, runs: int, warmups: int) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="perf-guardrail-") as tmp_dir:
        temp_root = Path(tmp_dir)
        settings = build_settings(project_root=temp_root)
        settings.paths.db_path.parent.mkdir(parents=True, exist_ok=True)
        service = CVMReadService(settings=settings)
        init_db_tables(service.engine)
        seed_synthetic_benchmark_data(service.engine)

        app = create_app(settings=settings, read_service=service)
        endpoints: dict[str, Any] = {}
        with TestClient(app) as client:
            for spec in API_ENDPOINT_SPECS:
                endpoints[spec["id"]] = {
                    "method": spec["method"],
                    "path": spec["path"],
                    "params": spec["params"],
                    **_time_request(
                        client,
                        method=spec["method"],
                        path=spec["path"],
                        params=spec["params"],
                        runs=runs,
                        warmups=warmups,
                    ),
                }
        service.engine.dispose()

    return {
        "dataset": {
            "companies": N_COMPANIES,
            "annual_years": [int(year) for year in ANNUAL_YEARS],
            "rows_note": "Synthetic benchmark dataset seeded via scripts/benchmark_read_paths.py",
        },
        "endpoints": endpoints,
    }


def capture_snapshot(*, api_runs: int, api_warmups: int) -> dict[str, Any]:
    web_snapshot = collect_web_snapshot()
    api_snapshot = collect_api_snapshot(runs=api_runs, warmups=api_warmups)
    return {
        "generated_at": _now_iso(),
        "web": {
            "framework": web_snapshot["framework"],
            "routes": web_snapshot["routes"],
        },
        "api": api_snapshot,
    }


def _default_guardrail_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    guardrailed = json.loads(json.dumps(snapshot))
    for _, data in guardrailed["web"]["routes"].items():
        baseline_bytes = int(data["first_load_uncompressed_js_bytes"])
        data["guardrail"] = {
            "required_rendering_mode": data["rendering_mode"],
            "required_revalidate_seconds": data["revalidate_seconds"],
            "max_first_load_uncompressed_js_bytes": baseline_bytes + max(50_000, int(baseline_bytes * 0.08)),
        }
    for _, data in guardrailed["api"]["endpoints"].items():
        median = float(data["median_ms"])
        p95 = float(data["p95_ms"])
        data["guardrail"] = {
            "max_median_ms": round(max(15.0, median * 1.75), 2),
            "max_p95_ms": round(max(25.0, p95 * 1.9), 2),
        }
    guardrailed["metadata"] = {
        "owner_lane": "ops-quality",
        "issue": 138,
        "purpose": "Baseline and light guardrails for main web routes and hot API endpoints.",
    }
    return guardrailed


def _compare_web(baseline: dict[str, Any], current: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    for route, expected in baseline["web"]["routes"].items():
        actual = current["web"]["routes"].get(route)
        if actual is None:
            failures.append(f"Missing web route in current snapshot: {route}")
            continue
        guardrail = expected["guardrail"]
        if actual["rendering_mode"] != guardrail["required_rendering_mode"]:
            failures.append(
                f"Web route {route} changed rendering mode: "
                f"{actual['rendering_mode']} != {guardrail['required_rendering_mode']}"
            )
        if actual.get("revalidate_seconds") != guardrail["required_revalidate_seconds"]:
            failures.append(
                f"Web route {route} changed revalidate_seconds: "
                f"{actual.get('revalidate_seconds')} != {guardrail['required_revalidate_seconds']}"
            )
        if actual["first_load_uncompressed_js_bytes"] > guardrail["max_first_load_uncompressed_js_bytes"]:
            failures.append(
                f"Web route {route} exceeded JS budget: "
                f"{actual['first_load_uncompressed_js_bytes']} > "
                f"{guardrail['max_first_load_uncompressed_js_bytes']}"
            )
    return failures


def _compare_api(baseline: dict[str, Any], current: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    for endpoint_id, expected in baseline["api"]["endpoints"].items():
        actual = current["api"]["endpoints"].get(endpoint_id)
        if actual is None:
            failures.append(f"Missing API endpoint in current snapshot: {endpoint_id}")
            continue
        guardrail = expected["guardrail"]
        if float(actual["median_ms"]) > float(guardrail["max_median_ms"]):
            failures.append(
                f"API endpoint {endpoint_id} exceeded median budget: "
                f"{actual['median_ms']} > {guardrail['max_median_ms']}"
            )
        if float(actual["p95_ms"]) > float(guardrail["max_p95_ms"]):
            failures.append(
                f"API endpoint {endpoint_id} exceeded p95 budget: "
                f"{actual['p95_ms']} > {guardrail['max_p95_ms']}"
            )
    return failures


def check_snapshot(
    *,
    baseline_path: Path,
    api_runs: int,
    api_warmups: int,
) -> dict[str, Any]:
    resolved_baseline_path = baseline_path.resolve()
    baseline = _json_load(resolved_baseline_path)
    current = capture_snapshot(api_runs=api_runs, api_warmups=api_warmups)
    failures = _compare_web(baseline, current) + _compare_api(baseline, current)
    try:
        baseline_display = str(resolved_baseline_path.relative_to(ROOT))
    except ValueError:
        baseline_display = str(resolved_baseline_path)
    return {
        "generated_at": _now_iso(),
        "baseline_path": baseline_display,
        "passed": not failures,
        "failures": failures,
        "baseline": baseline,
        "current": current,
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def _print_capture(snapshot: dict[str, Any]) -> None:
    print("Web routes")
    for route, data in snapshot["web"]["routes"].items():
        print(
            f"  {route:<18} mode={data['rendering_mode']:<7} "
            f"revalidate={data['revalidate_seconds']!s:<5} "
            f"first_load_js={data['first_load_uncompressed_js_bytes']}"
        )
    print("\nAPI endpoints")
    for endpoint_id, data in snapshot["api"]["endpoints"].items():
        print(
            f"  {endpoint_id:<52} median={data['median_ms']:>6}ms "
            f"p95={data['p95_ms']:>6}ms"
        )


def _print_check(report: dict[str, Any]) -> None:
    status = "PASS" if report["passed"] else "FAIL"
    print(f"Perf guardrail: {status}")
    if report["failures"]:
        print("Failures:")
        for failure in report["failures"]:
            print(f"  - {failure}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Performance baseline + guardrail tooling")
    subparsers = parser.add_subparsers(dest="command", required=True)

    capture_parser = subparsers.add_parser("capture", help="Capture current snapshot and write a baseline file")
    capture_parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_BASELINE_PATH,
        help="Where to write the captured baseline JSON.",
    )
    capture_parser.add_argument("--api-runs", type=int, default=5, help="Timed runs per API endpoint.")
    capture_parser.add_argument("--api-warmups", type=int, default=1, help="Warmup runs per API endpoint.")

    check_parser = subparsers.add_parser("check", help="Capture current snapshot and check against a baseline")
    check_parser.add_argument(
        "--baseline",
        type=Path,
        default=DEFAULT_BASELINE_PATH,
        help="Baseline JSON file with expected budgets and rendering modes.",
    )
    check_parser.add_argument("--api-runs", type=int, default=5, help="Timed runs per API endpoint.")
    check_parser.add_argument("--api-warmups", type=int, default=1, help="Warmup runs per API endpoint.")
    check_parser.add_argument(
        "--report",
        type=Path,
        help="Optional JSON report path for the current check result.",
    )

    args = parser.parse_args()

    if args.command == "capture":
        snapshot = capture_snapshot(api_runs=args.api_runs, api_warmups=args.api_warmups)
        baseline = _default_guardrail_snapshot(snapshot)
        _write_json(args.output, baseline)
        _print_capture(baseline)
        print(f"\nWrote baseline to {args.output}")
        return 0

    report = check_snapshot(
        baseline_path=args.baseline,
        api_runs=args.api_runs,
        api_warmups=args.api_warmups,
    )
    if args.report:
        _write_json(args.report, report)
    _print_check(report)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
