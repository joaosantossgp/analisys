"""Seed a deterministic SQLite database for web Playwright smoke tests."""

from __future__ import annotations

import sys
import os
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from apps.api.tests.conftest import (  # noqa: E402
    _seed_database,
    _write_active_universe_cache,
    _write_canonical_accounts,
)
from sqlalchemy import text  # noqa: E402
from src.db import build_engine  # noqa: E402
from src.settings import build_settings  # noqa: E402


def _sqlite_path_from_url(database_url: str) -> Path | None:
    parsed = urlparse(database_url)
    if parsed.scheme != "sqlite":
        return None

    if parsed.netloc:
        return Path(unquote(f"//{parsed.netloc}{parsed.path}"))
    return Path(unquote(parsed.path))


def _prepare_isolated_database_url() -> None:
    smoke_root = ROOT / ".tmp" / "web-smoke"
    os.environ.setdefault("CVM_DATA_DIR", str(smoke_root / "data"))
    os.environ.setdefault("CVM_CACHE_DIR", str(smoke_root / "cache"))
    os.environ.setdefault(
        "CVM_CANONICAL_ACCOUNTS_PATH",
        str(smoke_root / "config" / "canonical_accounts.csv"),
    )

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        db_path = smoke_root / "cvm_financials.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
        return

    db_path = _sqlite_path_from_url(database_url)
    if db_path is not None:
        db_path.parent.mkdir(parents=True, exist_ok=True)


def _shape_for_web_smoke(settings) -> None:
    engine = build_engine(settings)
    with engine.begin() as conn:
        conn.execute(text('DELETE FROM financial_reports WHERE "CD_CVM" = :cd_cvm'), {"cd_cvm": 9512})
        conn.execute(text("DELETE FROM company_refresh_status WHERE cd_cvm = :cd_cvm"), {"cd_cvm": 9512})


def main() -> int:
    _prepare_isolated_database_url()
    settings = build_settings(project_root=ROOT)
    _write_canonical_accounts(settings)
    _write_active_universe_cache(settings)
    _seed_database(settings)
    _shape_for_web_smoke(settings)
    print(f"Seeded web smoke database for {settings.database_url or settings.paths.sqlite_url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
