# -*- coding: utf-8 -*-
"""
Seed idempotente da tabela `companies` a partir do cadastro CVM.

- Insere ou atualiza todas as empresas ativas do catalogo.
- Mantem ticker_b3 e company_type ja existentes quando o catalogo nao traz
  informacao melhor.
- Atribui coverage_rank de 1 a 80 para os primeiros cd_cvm definidos em
  src.ticker_map.TICKER_MAP.
"""
from __future__ import annotations

import argparse
import io
import logging
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
from sqlalchemy import inspect, text

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.db import build_engine
from src.settings import build_settings
from src.startup import collect_startup_report, format_startup_report
from src.ticker_map import TICKER_MAP

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

CVM_MASTER_URL = "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv"
ACTIVE_STATUS_VALUES = {"ATIVO", "A"}
TOP_COVERAGE_CODES = tuple(list(TICKER_MAP)[:80])


def _clean_text(value: object) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    if not text_value or text_value.lower() == "nan":
        return None
    return text_value


def _first_nonempty(*values: object) -> str | None:
    for value in values:
        cleaned = _clean_text(value)
        if cleaned is not None:
            return cleaned
    return None


def fetch_cvm_catalog(timeout: int) -> pd.DataFrame:
    log.info("Baixando catalogo CVM: %s", CVM_MASTER_URL)
    response = requests.get(CVM_MASTER_URL, timeout=timeout)
    response.raise_for_status()

    df = pd.read_csv(
        io.BytesIO(response.content),
        sep=";",
        encoding="latin1",
        usecols=["CD_CVM", "DENOM_SOCIAL", "DENOM_COMERC", "CNPJ_CIA", "SETOR_ATIV", "SIT"],
        dtype={"CD_CVM": str, "CNPJ_CIA": str},
    )
    df["CD_CVM"] = df["CD_CVM"].fillna("").str.strip()
    df = df[df["CD_CVM"].str.match(r"^\d+$", na=False)].copy()
    df["CD_CVM"] = df["CD_CVM"].astype(int)
    df["DENOM_SOCIAL"] = df["DENOM_SOCIAL"].map(_clean_text)
    df["DENOM_COMERC"] = df["DENOM_COMERC"].map(_clean_text)
    df["CNPJ_CIA"] = df["CNPJ_CIA"].map(_clean_text)
    df["SETOR_ATIV"] = df["SETOR_ATIV"].map(_clean_text)
    df["SIT"] = df["SIT"].fillna("").astype(str).str.strip().str.upper()
    df["is_active"] = df["SIT"].isin(ACTIVE_STATUS_VALUES).astype(int)
    df = df.sort_values(["CD_CVM", "is_active"], ascending=[True, False])
    df = df.drop_duplicates(subset="CD_CVM", keep="first").set_index("CD_CVM")

    log.info(
        "  %s empresas no catalogo CVM | %s ativas",
        len(df),
        int(df["is_active"].sum()),
    )
    return df


def load_existing_companies(conn) -> pd.DataFrame:
    df = pd.read_sql(
        text(
            """
            SELECT
                cd_cvm,
                company_name,
                nome_comercial,
                cnpj,
                setor_cvm,
                setor_analitico,
                company_type,
                ticker_b3,
                coverage_rank,
                is_active
            FROM companies
            ORDER BY cd_cvm
            """
        ),
        conn,
    )
    if df.empty:
        return df.set_index("cd_cvm")

    df["cd_cvm"] = df["cd_cvm"].astype(int)
    return df.drop_duplicates(subset="cd_cvm", keep="last").set_index("cd_cvm")


def build_seed_dataframe(catalog_df: pd.DataFrame, existing_df: pd.DataFrame) -> tuple[pd.DataFrame, list[int]]:
    rank_by_code = {cd_cvm: rank for rank, cd_cvm in enumerate(TOP_COVERAGE_CODES, start=1)}
    selected_codes = set(catalog_df.index[catalog_df["is_active"] == 1].tolist())
    selected_codes.update(rank_by_code)

    missing_ranked_codes: list[int] = []
    rows: list[dict[str, object]] = []
    for cd_cvm in sorted(selected_codes):
        catalog_row = catalog_df.loc[cd_cvm] if cd_cvm in catalog_df.index else None
        existing_row = existing_df.loc[cd_cvm] if cd_cvm in existing_df.index else None

        if catalog_row is None and cd_cvm in rank_by_code:
            missing_ranked_codes.append(cd_cvm)

        company_name = _first_nonempty(
            catalog_row["DENOM_SOCIAL"] if catalog_row is not None else None,
            existing_row["company_name"] if existing_row is not None else None,
            f"CVM_{cd_cvm}",
        )
        rows.append(
            {
                "cd_cvm": cd_cvm,
                "company_name": company_name,
                "nome_comercial": _first_nonempty(
                    catalog_row["DENOM_COMERC"] if catalog_row is not None else None,
                    existing_row["nome_comercial"] if existing_row is not None else None,
                ),
                "cnpj": _first_nonempty(
                    catalog_row["CNPJ_CIA"] if catalog_row is not None else None,
                    existing_row["cnpj"] if existing_row is not None else None,
                ),
                "setor_cvm": _first_nonempty(
                    catalog_row["SETOR_ATIV"] if catalog_row is not None else None,
                    existing_row["setor_cvm"] if existing_row is not None else None,
                ),
                "setor_analitico": _first_nonempty(
                    existing_row["setor_analitico"] if existing_row is not None else None
                ),
                "company_type": _first_nonempty(
                    existing_row["company_type"] if existing_row is not None else None,
                    "comercial",
                ),
                "ticker_b3": _first_nonempty(
                    TICKER_MAP.get(cd_cvm),
                    existing_row["ticker_b3"] if existing_row is not None else None,
                ),
                "coverage_rank": rank_by_code.get(cd_cvm),
                "is_active": int(catalog_row["is_active"]) if catalog_row is not None else 0,
            }
        )

    return pd.DataFrame(rows), missing_ranked_codes


def upsert_companies(conn, df: pd.DataFrame, dry_run: bool) -> None:
    ranked_codes_sql = ", ".join(str(cd_cvm) for cd_cvm in TOP_COVERAGE_CODES)
    if dry_run:
        log.info("  [DRY-RUN] Processaria %s empresas", len(df))
        log.info("  [DRY-RUN] coverage_rank atribuido a %s empresas", int(df["coverage_rank"].notna().sum()))
        log.info("  [DRY-RUN] ticker_b3 preenchido em %s empresas", int(df["ticker_b3"].notna().sum()))
        return

    upsert_sql = text(
        """
        INSERT INTO companies
            (cd_cvm, company_name, nome_comercial, cnpj, setor_cvm,
             setor_analitico, company_type, ticker_b3, coverage_rank,
             is_active, updated_at)
        VALUES
            (:cd_cvm, :company_name, :nome_comercial, :cnpj, :setor_cvm,
             :setor_analitico, :company_type, :ticker_b3, :coverage_rank,
             :is_active, :updated_at)
        ON CONFLICT(cd_cvm) DO UPDATE SET
            company_name = excluded.company_name,
            nome_comercial = excluded.nome_comercial,
            cnpj = excluded.cnpj,
            setor_cvm = excluded.setor_cvm,
            setor_analitico = excluded.setor_analitico,
            company_type = excluded.company_type,
            ticker_b3 = excluded.ticker_b3,
            coverage_rank = excluded.coverage_rank,
            is_active = excluded.is_active,
            updated_at = excluded.updated_at
        """
    )

    updated_at = datetime.utcnow().replace(microsecond=0).isoformat()
    records = [
        {
            "cd_cvm": int(row["cd_cvm"]),
            "company_name": row["company_name"],
            "nome_comercial": row["nome_comercial"],
            "cnpj": row["cnpj"],
            "setor_cvm": row["setor_cvm"],
            "setor_analitico": row["setor_analitico"],
            "company_type": row["company_type"],
            "ticker_b3": row["ticker_b3"],
            "coverage_rank": int(row["coverage_rank"]) if pd.notna(row["coverage_rank"]) else None,
            "is_active": int(row["is_active"]),
            "updated_at": updated_at,
        }
        for _, row in df.iterrows()
    ]
    if records:
        conn.execute(upsert_sql, records)

    conn.execute(
        text(
            f"""
            UPDATE companies
            SET coverage_rank = NULL
            WHERE coverage_rank IS NOT NULL
              AND cd_cvm NOT IN ({ranked_codes_sql})
            """
        )
    )


def print_summary(conn) -> None:
    row = conn.execute(
        text(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_total,
                SUM(CASE WHEN ticker_b3 IS NOT NULL THEN 1 ELSE 0 END) AS with_ticker,
                SUM(CASE WHEN coverage_rank IS NOT NULL THEN 1 ELSE 0 END) AS ranked_total
            FROM companies
            """
        )
    ).fetchone()
    log.info("  Total em companies: %s", row[0] or 0)
    log.info("  Ativas em companies: %s", row[1] or 0)
    log.info("  Com ticker_b3: %s", row[2] or 0)
    log.info("  Com coverage_rank: %s", row[3] or 0)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed idempotente da tabela companies com catalogo CVM")
    parser.add_argument("--dry-run", action="store_true", help="Mostra o plano sem gravar no banco")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = build_settings(project_root=ROOT)
    report = collect_startup_report(
        settings,
        require_database=True,
        required_tables=("companies",),
        require_canonical_accounts=False,
    )
    if report.issues:
        log.info(format_startup_report(report))
        if report.errors:
            raise SystemExit(1)

    engine = build_engine(settings)
    columns = {column["name"] for column in inspect(engine).get_columns("companies")}
    if "coverage_rank" not in columns:
        raise SystemExit("Tabela companies sem coverage_rank. Execute: python scripts/setup_db.py --step 2")

    catalog_df = fetch_cvm_catalog(settings.company_list_timeout)
    with engine.begin() as conn:
        existing_df = load_existing_companies(conn)
        log.info("  %s empresas ja existentes em companies", len(existing_df))
        seed_df, missing_ranked_codes = build_seed_dataframe(catalog_df, existing_df)
        if missing_ranked_codes:
            preview = ", ".join(str(code) for code in missing_ranked_codes[:10])
            suffix = "..." if len(missing_ranked_codes) > 10 else ""
            log.warning(
                "  %s codigos ranqueados nao apareceram no catalogo CVM; placeholders/linhas existentes serao usados: %s%s",
                len(missing_ranked_codes),
                preview,
                suffix,
            )

        upsert_companies(conn, seed_df, args.dry_run)
        if not args.dry_run:
            print_summary(conn)


if __name__ == "__main__":
    main()
