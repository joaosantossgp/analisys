from __future__ import annotations

import logging
import os

from src.refresh_job_worker import RefreshJobWorker, RefreshWorkerConfig
from src.settings import get_settings


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return float(default)
    return float(raw)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return int(default)
    return int(raw)


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    config = RefreshWorkerConfig(
        worker_id=os.getenv("REFRESH_WORKER_ID") or RefreshWorkerConfig().worker_id,
        poll_interval_seconds=_env_float("REFRESH_WORKER_POLL_SECONDS", 2.0),
        heartbeat_interval_seconds=_env_float("REFRESH_WORKER_HEARTBEAT_SECONDS", 5.0),
        lease_seconds=_env_int("REFRESH_WORKER_LEASE_SECONDS", 60),
        max_attempts=_env_int("REFRESH_WORKER_MAX_ATTEMPTS", 3),
    )
    worker = RefreshJobWorker(
        settings=get_settings(),
        config=config,
    )
    worker.run_forever()


if __name__ == "__main__":
    main()
