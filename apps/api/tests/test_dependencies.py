from __future__ import annotations

from types import SimpleNamespace

from apps.api.app import dependencies


def _settings(tmp_path):
    return SimpleNamespace(
        database_url="",
        paths=SimpleNamespace(
            db_path=tmp_path / "data" / "cvm_financials.db",
            project_root=tmp_path,
        ),
    )


def test_ensure_api_ready_caches_successful_report(monkeypatch, tmp_path) -> None:
    calls = 0
    report = SimpleNamespace(ok=True, errors=())

    def fake_collect(settings, *, warn_on_legacy_data):
        nonlocal calls
        calls += 1
        return report

    dependencies.clear_api_ready_cache()
    monkeypatch.setattr(dependencies, "collect_api_startup_report", fake_collect)
    try:
        settings = _settings(tmp_path)

        assert dependencies.ensure_api_ready(settings) is report
        assert dependencies.ensure_api_ready(settings) is report
        assert calls == 1
    finally:
        dependencies.clear_api_ready_cache()


def test_ensure_api_ready_does_not_cache_failed_report(monkeypatch, tmp_path) -> None:
    calls = 0
    failed = SimpleNamespace(
        ok=False,
        errors=(SimpleNamespace(message="database unavailable"),),
    )

    def fake_collect(settings, *, warn_on_legacy_data):
        nonlocal calls
        calls += 1
        return failed

    dependencies.clear_api_ready_cache()
    monkeypatch.setattr(dependencies, "collect_api_startup_report", fake_collect)
    try:
        settings = _settings(tmp_path)

        for _ in range(2):
            try:
                dependencies.ensure_api_ready(settings)
            except dependencies.ServiceUnavailableError:
                pass
            else:
                raise AssertionError("expected ServiceUnavailableError")

        assert calls == 2
    finally:
        dependencies.clear_api_ready_cache()
