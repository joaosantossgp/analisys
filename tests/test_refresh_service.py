# -*- coding: utf-8 -*-
from __future__ import annotations

import sqlite3
from pathlib import Path

from src.contracts import RefreshPolicy, RefreshRequest
from src.refresh_service import HeadlessRefreshService
from src.settings import build_settings


def _create_financial_reports_table(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(str(path)) as conn:
        conn.execute(
            """
            CREATE TABLE financial_reports (
                CD_CVM INTEGER,
                COMPANY_NAME TEXT,
                REPORT_YEAR INTEGER,
                STATEMENT_TYPE TEXT,
                PERIOD_LABEL TEXT
            )
            """
        )
        conn.commit()


def _insert_rows(path: Path, rows: list[tuple[int, str, int, str, str]]) -> None:
    with sqlite3.connect(str(path)) as conn:
        conn.executemany(
            """
            INSERT INTO financial_reports (
                CD_CVM, COMPANY_NAME, REPORT_YEAR, STATEMENT_TYPE, PERIOD_LABEL
            ) VALUES (?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()


def _make_service(tmp_path: Path) -> HeadlessRefreshService:
    settings = build_settings(project_root=tmp_path)
    return HeadlessRefreshService(settings=settings)


def test_build_company_year_plan_requires_annual_period_for_closed_years(tmp_path: Path):
    db_path = tmp_path / "data" / "db" / "cvm_financials.db"
    _create_financial_reports_table(db_path)
    _insert_rows(
        db_path,
        [
            (9512, "PETROBRAS", 2025, "BPA", "1Q25"),
            (9512, "PETROBRAS", 2025, "BPP", "2Q25"),
            (9512, "PETROBRAS", 2025, "DRE", "3Q25"),
            (9512, "PETROBRAS", 2025, "DFC", "3Q25"),
            (4170, "VALE", 2025, "BPA", "2025"),
            (4170, "VALE", 2025, "BPP", "2025"),
            (4170, "VALE", 2025, "DRE", "2025"),
            (4170, "VALE", 2025, "DFC", "2025"),
        ],
    )

    service = _make_service(tmp_path)
    request = RefreshRequest(
        companies=("9512", "4170"),
        start_year=2025,
        end_year=2025,
        policy=RefreshPolicy(
            skip_complete_company_years=True,
            enable_fast_lane=False,
            force_refresh=False,
        ),
    )

    planned_companies, year_overrides, stats = service.build_company_year_plan(request)

    assert planned_companies == ["9512"]
    assert year_overrides == {9512: [2025]}
    assert stats["planned_company_years"] == 1
    assert stats["skipped_complete_company_years"] == 1


def test_build_company_year_plan_treats_closed_year_as_complete_after_annual_insert(tmp_path: Path):
    db_path = tmp_path / "data" / "db" / "cvm_financials.db"
    _create_financial_reports_table(db_path)
    _insert_rows(
        db_path,
        [
            (9512, "PETROBRAS", 2025, "BPA", "1Q25"),
            (9512, "PETROBRAS", 2025, "BPP", "2Q25"),
            (9512, "PETROBRAS", 2025, "DRE", "3Q25"),
            (9512, "PETROBRAS", 2025, "DFC", "3Q25"),
            (9512, "PETROBRAS", 2025, "BPA", "2025"),
            (9512, "PETROBRAS", 2025, "BPP", "2025"),
            (9512, "PETROBRAS", 2025, "DRE", "2025"),
            (9512, "PETROBRAS", 2025, "DFC", "2025"),
        ],
    )

    service = _make_service(tmp_path)
    request = RefreshRequest(
        companies=("9512",),
        start_year=2025,
        end_year=2025,
        policy=RefreshPolicy(
            skip_complete_company_years=True,
            enable_fast_lane=False,
            force_refresh=False,
        ),
    )

    planned_companies, year_overrides, stats = service.build_company_year_plan(request)

    assert planned_companies == []
    assert year_overrides == {}
    assert stats["planned_company_years"] == 0
    assert stats["skipped_complete_company_years"] == 1
