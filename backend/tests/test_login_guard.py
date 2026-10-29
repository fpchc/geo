"""登录守卫单测（无需真实 Redis）。"""

from __future__ import annotations

from typing import Any, cast

import pytest
import redis.exceptions

from app.core.exceptions import ServiceUnavailableException
from app.core.security.login_guard import (
    LoginGuard,
    LoginGuardConfig,
    evaluate_lockout,
    evaluate_rate_limit,
)


class _FailingRedis:
    async def eval(self, *args: object) -> object:
        raise redis.exceptions.ConnectionError("redis down")


def test_rate_limit_allows_at_limit() -> None:
    decision = evaluate_rate_limit(count=10, limit=10, ttl=30)
    assert decision.allowed is True
    assert decision.reason is None
    assert decision.retry_after == 0


def test_rate_limit_blocks_over_limit() -> None:
    decision = evaluate_rate_limit(count=11, limit=10, ttl=30)
    assert decision.allowed is False
    assert decision.reason == "rate_limited"
    assert decision.retry_after == 30


def test_rate_limit_uses_minimum_retry_after() -> None:
    decision = evaluate_rate_limit(count=11, limit=10, ttl=0)
    assert decision.retry_after == 1


def test_lockout_allows_when_key_missing() -> None:
    decision = evaluate_lockout(ttl=-2)
    assert decision.allowed is True
    assert decision.reason is None


def test_lockout_blocks_with_ttl() -> None:
    decision = evaluate_lockout(ttl=30)
    assert decision.allowed is False
    assert decision.reason == "locked"
    assert decision.retry_after == 30


def test_lockout_without_expiry_uses_minimum() -> None:
    decision = evaluate_lockout(ttl=-1)
    assert decision.allowed is False
    assert decision.retry_after == 1


async def test_redis_failure_maps_to_service_unavailable() -> None:
    config = LoginGuardConfig(
        rate_limit=10,
        rate_window_seconds=60,
        rate_key_prefix="test:rate",
        failure_threshold=5,
        failure_window_seconds=900,
        lockout_seconds=900,
        failure_key_prefix="test:fail",
        lock_key_prefix="test:lock",
    )
    guard = LoginGuard(cast("Any", _FailingRedis()), config)
    with pytest.raises(ServiceUnavailableException):
        await guard.check("127.0.0.1", "alice")
