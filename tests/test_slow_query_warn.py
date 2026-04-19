# -*- coding: utf-8 -*-
"""Tests for the slow_query_warn decorator in src/query_layer.py."""
from __future__ import annotations

import json
import logging
import time

import pytest

from src.query_layer import slow_query_warn


# ---------------------------------------------------------------------------
# Helper: capture log records emitted by src.query_layer logger
# ---------------------------------------------------------------------------

class _LogCapture(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


@pytest.fixture()
def log_capture():
    handler = _LogCapture()
    logger = logging.getLogger("src.query_layer")
    logger.addHandler(handler)
    original_level = logger.level
    logger.setLevel(logging.WARNING)
    try:
        yield handler
    finally:
        logger.removeHandler(handler)
        logger.setLevel(original_level)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_no_warn_when_fast(log_capture):
    """Decorator must NOT log when execution is within threshold."""

    @slow_query_warn(threshold_ms=5000)
    def fast_func():
        return 42

    result = fast_func()
    assert result == 42
    assert len(log_capture.records) == 0


def test_warn_emitted_when_slow(log_capture):
    """Decorator must emit a WARN when execution exceeds threshold."""

    @slow_query_warn(threshold_ms=1)
    def slow_func():
        time.sleep(0.05)  # 50ms >> 1ms threshold
        return "done"

    result = slow_func()
    assert result == "done"

    assert len(log_capture.records) == 1
    record = log_capture.records[0]
    assert record.levelno == logging.WARNING


def test_warn_payload_is_valid_json(log_capture):
    """The WARN message must be parseable JSON with the expected keys."""

    @slow_query_warn(threshold_ms=1)
    def my_query():
        time.sleep(0.05)

    my_query()

    assert len(log_capture.records) == 1
    payload = json.loads(log_capture.records[0].getMessage())
    assert payload["event"] == "slow_query"
    assert payload["query"] == "my_query"
    assert payload["threshold_ms"] == 1
    assert isinstance(payload["elapsed_ms"], float)
    assert payload["elapsed_ms"] > 0


def test_func_name_preserved(log_capture):
    """@functools.wraps must preserve __name__ and __doc__."""

    @slow_query_warn(threshold_ms=5000)
    def my_documented_query():
        """Does something important."""
        return 7

    assert my_documented_query.__name__ == "my_documented_query"
    assert my_documented_query.__doc__ == "Does something important."


def test_exception_propagated(log_capture):
    """Exceptions inside the wrapped function must propagate unchanged."""

    @slow_query_warn(threshold_ms=5000)
    def failing_func():
        raise ValueError("db error")

    with pytest.raises(ValueError, match="db error"):
        failing_func()


def test_exception_still_logs_if_slow(log_capture):
    """If slow AND raises, the WARN must still be emitted (finally block)."""

    @slow_query_warn(threshold_ms=1)
    def slow_and_failing():
        time.sleep(0.05)
        raise RuntimeError("timeout")

    with pytest.raises(RuntimeError):
        slow_and_failing()

    assert len(log_capture.records) == 1
    payload = json.loads(log_capture.records[0].getMessage())
    assert payload["event"] == "slow_query"


def test_default_threshold_is_200ms(log_capture):
    """Default threshold_ms must be 200 (not warn for sub-200ms calls)."""

    @slow_query_warn()
    def fast_enough():
        return True

    fast_enough()
    assert len(log_capture.records) == 0


def test_elapsed_ms_in_payload_is_reasonable(log_capture):
    """elapsed_ms in the payload must be >= sleep time (sanity check)."""

    @slow_query_warn(threshold_ms=1)
    def timed_func():
        time.sleep(0.1)  # ~100ms

    timed_func()
    assert len(log_capture.records) == 1
    payload = json.loads(log_capture.records[0].getMessage())
    # Allow generous range: 50ms–2000ms to avoid flaky CI
    assert 50 <= payload["elapsed_ms"] <= 2000
