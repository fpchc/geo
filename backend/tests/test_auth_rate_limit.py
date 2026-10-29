"""登录 IP 限流集成测试（需要 MySQL/Redis）。"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.rbac import User


async def test_login_rate_limit_returns_429(
    integration_client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "auth_login_rate_limit_per_minute", 3)

    user = User(
        username="rate-user",
        hashed_password=await hash_password("rate-pass"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    payload = {"username": "rate-user", "password": "rate-pass"}
    for _ in range(3):
        response = await integration_client.post(
            f"{settings.api_v1_prefix}/auth/login",
            json=payload,
        )
        assert response.status_code == 200

    response = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json=payload,
    )

    assert response.status_code == 429
    body = response.json()
    assert body["code"] == 20005
    assert body["message"] == "尝试次数过多，请稍后再试"
    assert int(response.headers["Retry-After"]) >= 1
