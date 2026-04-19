# -*- coding: utf-8 -*-
from __future__ import annotations

from dashboard import services


def test_get_read_service_reuses_single_cached_instance(monkeypatch):
    created_instances = []

    class FakeReadService:
        def __init__(self):
            created_instances.append(self)

    monkeypatch.setattr(services, "CVMReadService", FakeReadService)
    services.get_read_service.clear()
    try:
        first = services.get_read_service()
        second = services.get_read_service()
    finally:
        services.get_read_service.clear()

    assert first is second
    assert created_instances == [first]
