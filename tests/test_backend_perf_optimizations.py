from __future__ import annotations

import threading
from dataclasses import dataclass

from desktop.bridge import CVMBridge
from src.query_layer import CVMQueryLayer
from src.read_service import CVMReadService
from src.scraper import CVMScraper


@dataclass(frozen=True)
class _DirectoryPayload:
    items: tuple = ()
    pagination: dict | None = None
    applied_filters: dict | None = None


class _BridgeService:
    def __init__(self) -> None:
        self.company_calls: list[dict[str, object]] = []
        self.suggestion_calls: list[dict[str, object]] = []

    def list_companies(self, **kwargs: object) -> _DirectoryPayload:
        self.company_calls.append(dict(kwargs))
        return _DirectoryPayload(
            items=(),
            pagination={"page_size": kwargs["page_size"]},
            applied_filters={},
        )

    def suggest_companies(self, **kwargs: object) -> tuple:
        self.suggestion_calls.append(dict(kwargs))
        return ()


def test_desktop_bridge_caps_company_pagination_and_suggestion_limit() -> None:
    bridge = CVMBridge()
    service = _BridgeService()
    bridge._service = service

    companies_payload = bridge.get_companies({"page_size": 1000, "page": 2})
    suggestions_payload = bridge.get_company_suggestions({"limit": 1000})

    assert companies_payload["pagination"]["page_size"] == 100
    assert service.company_calls[0]["page_size"] == 100
    assert service.company_calls[0]["page"] == 2
    assert suggestions_payload == {"items": []}
    assert service.suggestion_calls[0]["limit"] == 100


class _EmptyQueryLayer:
    def get_company_info_with_read_model_state(self, cd_cvm: int) -> dict:
        return {}


class _ExplodingCatalog:
    def lookup_company(self, cd_cvm: int):
        raise AssertionError("catalog lookup should be deferred")


def test_read_service_can_skip_blocking_catalog_lookup() -> None:
    service = object.__new__(CVMReadService)
    service.query_layer = _EmptyQueryLayer()
    service._company_catalog = _ExplodingCatalog()

    assert service.get_company_info(999999, allow_catalog_lookup=False) is None


def test_hot_read_paths_are_lru_cached() -> None:
    assert hasattr(CVMReadService.list_companies, "cache_info")
    assert hasattr(CVMReadService.get_available_years, "cache_info")
    assert hasattr(CVMReadService.suggest_companies, "cache_info")
    assert hasattr(CVMQueryLayer.get_sector_years_map, "cache_info")


def test_scraper_reuses_thread_local_http_session() -> None:
    scraper = object.__new__(CVMScraper)
    scraper._http_state = threading.local()

    first = CVMScraper._http_session(scraper)
    second = CVMScraper._http_session(scraper)

    assert first is second
