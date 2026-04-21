#!/usr/bin/env python3
"""
scripts/benchmark_read_paths.py — Repeatable read-path benchmark for CVM query layer.

Builds a synthetic in-memory SQLite dataset (449 companies, ~110k financial_reports
rows) that approximates real production scale, then times the main read paths
and prints EXPLAIN QUERY PLAN for each.

Usage:
    python scripts/benchmark_read_paths.py
    python scripts/benchmark_read_paths.py --runs 10
    python scripts/benchmark_read_paths.py --phase after  # compare post-index run

Output: timing table + EXPLAIN QUERY PLAN per query printed to stdout.
"""
from __future__ import annotations

import argparse
import random
import statistics
import sys
import time
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

# --- project root on sys.path -----------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.database import init_db_tables  # noqa: E402

# --- synthetic dataset dimensions -------------------------------------------
N_COMPANIES = 449
N_YEARS = 6          # 2019-2024
N_ACCOUNTS_DRE = 4   # 3.01 3.03 3.05 3.11
N_ACCOUNTS_BPA = 3   # 1 1.01 1.01.01
N_ACCOUNTS_BPP = 4   # 2 2.01 2.02 2.03
N_ACCOUNTS_DFC = 3   # 6.01 6.02 6.03
N_STMT_TYPES = 4

SECTORS = [
    "Energia", "Materiais Basicos", "Financeiro", "Saneamento",
    "Consumo Ciclico", "Consumo nao Ciclico", "Saude", "Tecnologia",
    "Utilidades", "Industria",
]
STMT_ACCOUNTS = {
    "DRE": [("3.01", "Receita"), ("3.03", "Res_Bruto"), ("3.05", "EBIT"), ("3.11", "Lucro_Liq")],
    "BPA": [("1", "Ativo Total"), ("1.01", "Ativo Circ"), ("1.01.01", "Caixa")],
    "BPP": [("2", "Passivo Total"), ("2.01", "PC"), ("2.02", "PNC"), ("2.03", "PL")],
    "DFC": [("6.01", "FCO"), ("6.02", "FCI"), ("6.03", "FCF")],
}
ANNUAL_YEARS = list(range(2019, 2025))


def build_synthetic_benchmark_engine() -> object:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    init_db_tables(engine)
    return engine


def seed_synthetic_benchmark_data(engine) -> None:
    rng = random.Random(42)
    company_rows = []
    for i in range(N_COMPANIES):
        cd_cvm = 1000 + i
        sector = SECTORS[i % len(SECTORS)]
        company_rows.append({
            "cd_cvm": cd_cvm,
            "company_name": f"EMPRESA {i:04d}",
            "nome_comercial": f"Empresa {i}",
            "cnpj": f"{i:014d}",
            "setor_cvm": sector,
            "setor_analitico": sector if i % 3 != 0 else None,
            "company_type": "comercial",
            "ticker_b3": f"EMP{i:04d}" if i % 5 != 0 else None,
            "coverage_rank": i + 1 if i < 100 else None,
            "is_active": 1,
            "updated_at": "2026-01-01T00:00:00",
        })

    fr_rows = []
    line_seq = 0
    for company in company_rows:
        cd_cvm = company["cd_cvm"]
        for year in ANNUAL_YEARS:
            for stmt_type, accounts in STMT_ACCOUNTS.items():
                for cd_conta, ds_conta in accounts:
                    line_seq += 1
                    fr_rows.append({
                        "COMPANY_NAME": company["company_name"],
                        "CD_CVM": cd_cvm,
                        "COMPANY_TYPE": "comercial",
                        "STATEMENT_TYPE": stmt_type,
                        "REPORT_YEAR": year,
                        "PERIOD_LABEL": str(year),
                        "LINE_ID_BASE": f"l{line_seq}",
                        "CD_CONTA": cd_conta,
                        "DS_CONTA": ds_conta,
                        "STANDARD_NAME": ds_conta,
                        "QA_CONFLICT": rng.random() < 0.02,
                        "VL_CONTA": rng.uniform(100.0, 1_000_000.0),
                    })
            # one quarterly row per company per year (PERIOD_LABEL != REPORT_YEAR)
            line_seq += 1
            fr_rows.append({
                "COMPANY_NAME": company["company_name"],
                "CD_CVM": cd_cvm,
                "COMPANY_TYPE": "comercial",
                "STATEMENT_TYPE": "DRE",
                "REPORT_YEAR": year,
                "PERIOD_LABEL": f"1Q{str(year)[-2:]}",
                "LINE_ID_BASE": f"l{line_seq}",
                "CD_CONTA": "3.01",
                "DS_CONTA": "Receita",
                "STANDARD_NAME": "Receita",
                "QA_CONFLICT": False,
                "VL_CONTA": rng.uniform(100.0, 500_000.0),
            })

    with engine.begin() as conn:
        pd.DataFrame(company_rows).to_sql("companies", conn, if_exists="append", index=False)
        chunk = 5000
        df_fr = pd.DataFrame(fr_rows)
        for start in range(0, len(df_fr), chunk):
            df_fr.iloc[start : start + chunk].to_sql(
                "financial_reports", conn, if_exists="append", index=False
            )


def _time_query(engine, sql_str: str, params: dict, runs: int) -> list[float]:
    sql = text(sql_str)
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        pd.read_sql(sql, engine, params=params)
        times.append((time.perf_counter() - t0) * 1000)
    return times


def _explain(engine, sql_str: str, params: dict) -> str:
    sql_str_explain = f"EXPLAIN QUERY PLAN {sql_str}"
    with engine.connect() as conn:
        rows = conn.execute(text(sql_str_explain), params).fetchall()
    return "\n".join(f"  {' | '.join(str(c) for c in r)}" for r in rows)


_CANONICAL = """
COALESCE(
    NULLIF(TRIM(c.setor_analitico), ''),
    NULLIF(TRIM(c.setor_cvm), ''),
    'Nao classificado'
)
"""

QUERIES: list[tuple[str, str, dict]] = [
    (
        "companies_directory_page (search='', p=1 ps=20)",
        f"""
        SELECT c.cd_cvm, c.company_name, COALESCE(c.ticker_b3,'') AS ticker_b3,
               c.setor_analitico, c.setor_cvm,
               {_CANONICAL} AS sector_name,
               COALESCE(COUNT(fr."CD_CVM"),0) AS total_rows,
               CASE WHEN COUNT(fr."CD_CVM") > 0 THEN 1 ELSE 0 END AS has_financial_data,
               c.coverage_rank
        FROM companies c
        LEFT JOIN financial_reports fr ON fr."CD_CVM" = c.cd_cvm
        WHERE 1=1
        GROUP BY c.cd_cvm, c.company_name, c.ticker_b3, c.setor_analitico, c.setor_cvm, c.coverage_rank
        ORDER BY c.company_name ASC
        LIMIT 20 OFFSET 0
        """,
        {},
    ),
    (
        "companies_directory_page (search='empresa 01%')",
        f"""
        SELECT c.cd_cvm, c.company_name, COALESCE(c.ticker_b3,'') AS ticker_b3,
               c.setor_analitico, c.setor_cvm,
               {_CANONICAL} AS sector_name,
               COALESCE(COUNT(fr."CD_CVM"),0) AS total_rows,
               CASE WHEN COUNT(fr."CD_CVM") > 0 THEN 1 ELSE 0 END AS has_financial_data,
               c.coverage_rank
        FROM companies c
        LEFT JOIN financial_reports fr ON fr."CD_CVM" = c.cd_cvm
        WHERE (LOWER(c.company_name) LIKE :search
               OR LOWER(COALESCE(c.ticker_b3,'')) LIKE :search
               OR CAST(c.cd_cvm AS TEXT) LIKE :search)
        GROUP BY c.cd_cvm, c.company_name, c.ticker_b3, c.setor_analitico, c.setor_cvm, c.coverage_rank
        ORDER BY c.company_name ASC
        LIMIT 20 OFFSET 0
        """,
        {"search": "%empresa 01%"},
    ),
    (
        "company_years_map (cd_cvm list of 20)",
        """
        SELECT "CD_CVM", "REPORT_YEAR"
        FROM financial_reports
        WHERE "CD_CVM" IN (1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,
                           1010,1011,1012,1013,1014,1015,1016,1017,1018,1019)
          AND "PERIOD_LABEL" = CAST("REPORT_YEAR" AS TEXT)
        ORDER BY "CD_CVM", "REPORT_YEAR"
        """,
        {},
    ),
    (
        "available_years (single company)",
        """
        SELECT DISTINCT "REPORT_YEAR"
        FROM financial_reports
        WHERE "CD_CVM" = :cd_cvm
          AND "PERIOD_LABEL" = CAST("REPORT_YEAR" AS TEXT)
        ORDER BY "REPORT_YEAR"
        """,
        {"cd_cvm": 1100},
    ),
    (
        "sector_years_map (all sectors)",
        f"""
        SELECT DISTINCT {_CANONICAL} AS sector_name, fr."REPORT_YEAR"
        FROM financial_reports fr
        JOIN companies c ON c.cd_cvm = fr."CD_CVM"
        WHERE fr."PERIOD_LABEL" = CAST(fr."REPORT_YEAR" AS TEXT)
        ORDER BY sector_name, fr."REPORT_YEAR"
        """,
        {},
    ),
    (
        "available_company_sectors",
        f"""
        SELECT {_CANONICAL} AS sector_name,
               COUNT(DISTINCT c.cd_cvm) AS company_count
        FROM companies c
        LEFT JOIN financial_reports fr ON fr."CD_CVM" = c.cd_cvm
        GROUP BY {_CANONICAL}
        ORDER BY sector_name ASC
        """,
        {},
    ),
    (
        "sector_metric_rows (all sectors, all years)",
        f"""
        SELECT c.cd_cvm, c.company_name, c.ticker_b3,
               {_CANONICAL} AS sector_name,
               fr."REPORT_YEAR", fr."CD_CONTA",
               SUM(fr."VL_CONTA") AS account_value
        FROM financial_reports fr
        JOIN companies c ON c.cd_cvm = fr."CD_CVM"
        WHERE fr."PERIOD_LABEL" = CAST(fr."REPORT_YEAR" AS TEXT)
          AND fr."QA_CONFLICT" = 0
          AND fr."CD_CONTA" IN ('3.01','3.05','3.11','2.03')
        GROUP BY c.cd_cvm, c.company_name, c.ticker_b3, {_CANONICAL},
                 fr."REPORT_YEAR", fr."CD_CONTA"
        """,
        {},
    ),
    (
        "sector_metric_rows (single sector)",
        f"""
        SELECT c.cd_cvm, c.company_name, c.ticker_b3,
               {_CANONICAL} AS sector_name,
               fr."REPORT_YEAR", fr."CD_CONTA",
               SUM(fr."VL_CONTA") AS account_value
        FROM financial_reports fr
        JOIN companies c ON c.cd_cvm = fr."CD_CVM"
        WHERE fr."PERIOD_LABEL" = CAST(fr."REPORT_YEAR" AS TEXT)
          AND fr."QA_CONFLICT" = 0
          AND fr."CD_CONTA" IN ('3.01','3.05','3.11','2.03')
          AND {_CANONICAL} = :sector_name
        GROUP BY c.cd_cvm, c.company_name, c.ticker_b3, {_CANONICAL},
                 fr."REPORT_YEAR", fr."CD_CONTA"
        """,
        {"sector_name": "Energia"},
    ),
    (
        "company_suggestions (prefix='emp')",
        f"""
        SELECT c.cd_cvm, c.company_name,
               COALESCE(c.ticker_b3,'') AS ticker_b3,
               {_CANONICAL} AS sector_name
        FROM companies c
        WHERE LOWER(c.company_name) LIKE :contains
           OR LOWER(COALESCE(c.ticker_b3,'')) LIKE :contains
           OR CAST(c.cd_cvm AS TEXT) LIKE :contains
        ORDER BY
            CASE WHEN LOWER(COALESCE(c.ticker_b3,'')) = :exact THEN 0
                 WHEN LOWER(c.company_name) LIKE :prefix        THEN 1
                 WHEN LOWER(COALESCE(c.ticker_b3,'')) LIKE :prefix THEN 2
                 ELSE 3
            END ASC, c.company_name ASC
        LIMIT 6
        """,
        {"contains": "%emp%", "prefix": "emp%", "exact": "emp"},
    ),
    (
        "sector_companies (single sector)",
        f"""
        SELECT c.cd_cvm, c.company_name, COALESCE(c.ticker_b3,'') AS ticker_b3
        FROM companies c
        WHERE {_CANONICAL} = :sector_name
        ORDER BY c.company_name ASC
        """,
        {"sector_name": "Energia"},
    ),
]


def _fmt(times: list[float]) -> str:
    med = statistics.median(times)
    p95 = sorted(times)[int(len(times) * 0.95)]
    return f"med={med:7.1f}ms  p95={p95:7.1f}ms  min={min(times):7.1f}ms  max={max(times):7.1f}ms"


def run(runs: int, phase: str) -> None:
    print(f"\n{'='*78}")
    print(f"  CVM read-path benchmark -- phase={phase}  runs={runs}")
    print(f"  dataset: {N_COMPANIES} companies  ~{N_COMPANIES * len(ANNUAL_YEARS) * 15:,} fr rows")
    print(f"{'='*78}\n")

    engine = build_synthetic_benchmark_engine()
    print("Seeding synthetic data…", end=" ", flush=True)
    seed_synthetic_benchmark_data(engine)
    print("done.\n")

    print(f"{'Query':<52} {'Timings':>40}")
    print("-" * 94)

    results: list[tuple[str, list[float]]] = []
    for label, sql, params in QUERIES:
        times = _time_query(engine, sql, params, runs)
        results.append((label, times))
        print(f"  {label:<50} {_fmt(times)}")

    print("\n" + "=" * 78)
    print("  EXPLAIN QUERY PLAN\n" + "-" * 78)
    for label, sql, params in QUERIES:
        print(f"\n> {label}")
        print(_explain(engine, sql.strip(), params) or "  (no plan output)")

    print("\n" + "=" * 78)
    print("  SUMMARY\n")
    for label, times in results:
        med = statistics.median(times)
        flag = " ← SLOW (>200ms)" if med > 200 else (" ← WARNING (>50ms)" if med > 50 else "")
        print(f"  {med:7.1f}ms  {label}{flag}")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CVM read-path benchmark")
    parser.add_argument("--runs", type=int, default=7, help="Timing iterations per query")
    parser.add_argument("--phase", default="before", help="Label for this run (before/after)")
    args = parser.parse_args()
    run(runs=args.runs, phase=args.phase)
