"""用户名失败锁定集成测试（需要 MySQL/Redis）。"""

from __future__ import annotations

import asyncio

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.extensions.redis_ext import get_redis
from app.models.rbac import User


async def _create_user(db_session: AsyncSession, username: str, password: str) -> None:
    db_session.add(
        User(
            username=username,
            hashed_password=await hash_password(password),
            is_active=True,
        )
    )
    await db_session.commit()


async def _login(
    integration_client: AsyncClient,
    username: str,
    password: str,
) -> Response:
    return await integration_client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"username": username, "password": password},
    )


async def test_failure_lockout_returns_429(
    integration_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_login_rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "auth_login_failure_threshold", 2)
    await _create_user(db_session, "lock-user", "lock-pass")

    for _ in range(2):
        response = await _login(integration_client, "lock-user", "wrong")
        assert response.status_code == 401

    response = await _login(integration_client, "lock-user", "lock-pass")

    assert response.status_code == 429
    body = response.json()
    assert body["code"] == 20006
    assert body["message"] == "尝试次数过多，请稍后再试"
    assert int(response.headers["Retry-After"]) >= 1


async def test_success_resets_failure_counter(
    integration_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_login_rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "auth_login_failure_threshold", 2)
    await _create_user(db_session, "reset-user", "reset-pass")

    assert (await _login(integration_client, "reset-user", "wrong")).status_code == 401
    assert (await _login(integration_client, "reset-user", "reset-pass")).status_code == 200
    assert (await _login(integration_client, "reset-user", "wrong")).status_code == 401
    assert (await _login(integration_client, "reset-user", "reset-pass")).status_code == 200


async def test_lockout_expires_and_allows_login(
    integration_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_login_rate_limit_per_minute", 100)
    monkeypatch.setattr(settings, "auth_login_failure_threshold", 1)
    await _create_user(db_session, "expire-user", "expire-pass")

    assert (await _login(integration_client, "expire-user", "wrong")).status_code == 401
    assert (await _login(integration_client, "expire-user", "expire-pass")).status_code == 429

    lock_key = f"{settings.login_lock_key_prefix}:expire-user"
    await get_redis().expire(lock_key, 1)
    await asyncio.sleep(1.1)

    assert (await _login(integration_client, "expire-user", "expire-pass")).status_code == 200
