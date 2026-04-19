from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.read_service import CVMReadService


@st.cache_resource
def get_read_service() -> CVMReadService:
    # The dashboard is read-only, so one shared read service per process is sufficient.
    return CVMReadService()
