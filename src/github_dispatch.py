from __future__ import annotations

import logging
import os

import requests

log = logging.getLogger(__name__)

_DISPATCH_URL = "https://api.github.com/repos/{owner}/{repo}/actions/workflows/on_demand_ingest.yml/dispatches"


def dispatch_on_demand_ingest(
    cd_cvm: int,
    *,
    start_year: int | None = None,
    end_year: int | None = None,
) -> tuple[bool, str | None]:
    """Call GitHub Actions workflow dispatch for a single company."""
    token = os.getenv("GITHUB_TOKEN")
    owner = os.getenv("GITHUB_OWNER")
    repo = os.getenv("GITHUB_REPO")

    if not token:
        log.warning("GITHUB_TOKEN not set - on-demand dispatch skipped for cd_cvm=%s", cd_cvm)
        return False, "GITHUB_TOKEN not configured"
    if not owner or not repo:
        log.warning("GITHUB owner/repo not set - on-demand dispatch skipped for cd_cvm=%s", cd_cvm)
        return False, "GitHub repository not configured"

    inputs = {"cd_cvm": str(cd_cvm)}
    if start_year is not None:
        inputs["start_year"] = str(int(start_year))
    if end_year is not None:
        inputs["end_year"] = str(int(end_year))

    url = _DISPATCH_URL.format(owner=owner, repo=repo)
    try:
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={"ref": "main", "inputs": inputs},
            timeout=10,
        )
        if resp.status_code == 204:
            return True, None
        return False, f"GitHub returned {resp.status_code}: {resp.text[:200]}"
    except Exception as exc:
        log.exception("GitHub dispatch failed for cd_cvm=%s", cd_cvm)
        return False, str(exc)
