from __future__ import annotations

import functools
import sys
from pathlib import Path

try:
    import streamlit as st
except ModuleNotFoundError:
    class _StreamlitCacheFallback:
        @staticmethod
        def cache_resource(func=None, **_kwargs):
            def decorate(inner):
                cached = functools.lru_cache(maxsize=1)(inner)
                cached.clear = cached.cache_clear
                return cached

            return decorate if func is None else decorate(func)

    st = _StreamlitCacheFallback()

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.read_service import CVMReadService


@st.cache_resource
def get_read_service() -> CVMReadService:
    # The dashboard is read-only, so one shared read service per process is sufficient.
    return CVMReadService()
