"""
Desktop auto-updater — checks GitHub Releases, downloads, validates, and stages updates.

Flow:
  UpdateChecker.check_for_update()  — background thread on startup
  UpdateChecker.download_and_stage() — triggered by user action via bridge
  UpdateChecker.spawn_helper_and_exit() — spawns update_helper.ps1, then app exits
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Callable

import requests

GITHUB_REPO = "joaosantossgp/analisys"
_API_BASE = "https://api.github.com"
_APPDATA_DIR = Path(os.environ.get("LOCALAPPDATA", tempfile.gettempdir())) / "CVMAnalytics"
_SNOOZE_FILE = _APPDATA_DIR / "snooze.json"
_VERSIONS_DIR = _APPDATA_DIR / "versions"
_SNOOZE_DAYS = 7


def _parse_version(tag: str) -> tuple[int, ...]:
    """Convert 'v1.2.3' or '1.2.3' to (1, 2, 3) for comparison."""
    cleaned = tag.lstrip("v").strip()
    try:
        return tuple(int(x) for x in cleaned.split("."))
    except ValueError:
        return (0,)


class UpdateChecker:
    def check_for_update(self, current_version: str) -> dict | None:
        """
        Query GitHub for the latest release and return update info if a newer
        version is available and not snoozed. Returns None on network error or
        if already up to date.
        """
        try:
            resp = requests.get(
                f"{_API_BASE}/repos/{GITHUB_REPO}/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
                timeout=10,
            )
            resp.raise_for_status()
        except Exception:
            return None

        data = resp.json()
        tag = data.get("tag_name", "")
        if not tag:
            return None

        remote_ver = _parse_version(tag)
        local_ver = _parse_version(current_version)
        if remote_ver <= local_ver:
            return None

        if self.is_snoozed(tag):
            return None

        zip_url, sha256_url = self._find_asset_urls(data.get("assets", []), tag)
        if not zip_url:
            return None

        return {
            "version": tag.lstrip("v"),
            "tag": tag,
            "zip_url": zip_url,
            "sha256_url": sha256_url,
        }

    def is_snoozed(self, tag: str) -> bool:
        try:
            data = json.loads(_SNOOZE_FILE.read_text())
            if data.get("tag") == tag and data.get("until_ts", 0) > time.time():
                return True
        except Exception:
            pass
        return False

    def snooze(self, tag: str, days: int = _SNOOZE_DAYS) -> None:
        _APPDATA_DIR.mkdir(parents=True, exist_ok=True)
        _SNOOZE_FILE.write_text(
            json.dumps({"tag": tag, "until_ts": time.time() + days * 86400})
        )

    def download_and_stage(
        self,
        update_info: dict,
        progress_cb: Callable[[str, int], None],
    ) -> Path:
        """
        Download, validate, and extract the new bundle.
        progress_cb(status, percent) — called throughout.
        Raises on checksum mismatch or extraction failure.
        Returns the path to the extracted version directory.
        """
        version = update_info["version"]
        zip_url = update_info["zip_url"]
        sha256_url = update_info.get("sha256_url")

        zip_name = f"CVMAnalytics-windows-v{version}.zip"
        tmp_dir = Path(tempfile.gettempdir())
        zip_path = tmp_dir / zip_name
        sha256_path = tmp_dir / f"{zip_name}.sha256"

        progress_cb("downloading", 0)
        self._download_file(zip_url, zip_path, progress_cb)

        if sha256_url:
            progress_cb("validating", 90)
            try:
                self._download_file(sha256_url, sha256_path, lambda *_: None)
                self._validate_sha256(zip_path, sha256_path)
            except Exception:
                zip_path.unlink(missing_ok=True)
                sha256_path.unlink(missing_ok=True)
                raise

        progress_cb("extracting", 92)
        dest = _VERSIONS_DIR / version
        try:
            if dest.exists():
                import shutil
                shutil.rmtree(dest)
            dest.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_path) as zf:
                zf.extractall(dest)
        except Exception:
            import shutil
            shutil.rmtree(dest, ignore_errors=True)
            raise RuntimeError("extraction_failed")
        finally:
            zip_path.unlink(missing_ok=True)
            sha256_path.unlink(missing_ok=True)

        progress_cb("ready", 100)
        return dest

    def spawn_helper_and_exit(self, staged_path: Path) -> None:
        """
        Spawn the detached PowerShell helper that swaps files and relaunches,
        then signal the webview to close.
        """
        current_dir = self._current_exe_dir()
        helper = self._get_helper_path()

        subprocess.Popen(
            [
                "powershell.exe",
                "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-File", str(helper),
                str(staged_path),
                str(current_dir),
            ],
            creationflags=(
                subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
            ),
            close_fds=True,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _find_asset_urls(
        assets: list[dict], tag: str
    ) -> tuple[str | None, str | None]:
        ver = tag.lstrip("v")
        zip_name = f"CVMAnalytics-windows-v{ver}.zip"
        sha256_name = f"{zip_name}.sha256"
        zip_url = sha256_url = None
        for asset in assets:
            name = asset.get("name", "")
            url = asset.get("browser_download_url", "")
            if name == zip_name:
                zip_url = url
            elif name == sha256_name:
                sha256_url = url
        return zip_url, sha256_url

    @staticmethod
    def _download_file(
        url: str,
        dest: Path,
        progress_cb: Callable[[str, int], None],
    ) -> None:
        with requests.get(url, stream=True, timeout=30) as resp:
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0
            with dest.open("wb") as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total:
                            pct = min(int(downloaded / total * 85), 85)
                            progress_cb("downloading", pct)

    @staticmethod
    def _validate_sha256(zip_path: Path, sha256_path: Path) -> None:
        expected_line = sha256_path.read_text().strip().split()[0].lower()
        h = hashlib.sha256()
        with zip_path.open("rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        if h.hexdigest() != expected_line:
            raise ValueError("checksum_mismatch")

    @staticmethod
    def _get_helper_path() -> Path:
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            return Path(sys._MEIPASS) / "update_helper.ps1"  # type: ignore[attr-defined]
        return Path(__file__).parent / "update_helper.ps1"

    @staticmethod
    def _current_exe_dir() -> Path:
        if getattr(sys, "frozen", False):
            return Path(sys.executable).parent
        return Path(__file__).parent.parent / "dist" / "CVMAnalytics"
