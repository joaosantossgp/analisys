# -*- coding: utf-8 -*-
from __future__ import annotations

import math

import pandas as pd

from scripts.seed_catalog import TOP_COVERAGE_CODES, build_upsert_records


def test_build_upsert_records_normalizes_nullable_fields_to_none():
    df = pd.DataFrame(
        [
            {
                "cd_cvm": 1234,
                "company_name": "EMPRESA TESTE",
                "nome_comercial": pd.NA,
                "cnpj": float("nan"),
                "setor_cvm": "nan",
                "setor_analitico": "",
                "company_type": "comercial",
                "ticker_b3": math.nan,
                "coverage_rank": pd.NA,
                "is_active": 1,
            }
        ]
    )

    records = build_upsert_records(df, "2026-04-17T00:00:00")

    assert records == [
        {
            "cd_cvm": 1234,
            "company_name": "EMPRESA TESTE",
            "nome_comercial": None,
            "cnpj": None,
            "setor_cvm": None,
            "setor_analitico": None,
            "company_type": "comercial",
            "ticker_b3": None,
            "coverage_rank": None,
            "is_active": 1,
            "updated_at": "2026-04-17T00:00:00",
        }
    ]


def test_top_coverage_codes_expanded_to_120_without_duplicates():
    assert len(TOP_COVERAGE_CODES) == 120
    assert len(set(TOP_COVERAGE_CODES)) == 120
