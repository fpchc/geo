"""会话撤销集成测试：登出与刷新轮换（需要 MySQL/Redis）。"""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.rbac import User


async def _create_user(db_session: AsyncSession) -> None:
    db_session.add(
        User(
            username="session-user",
            hashed_password=await hash_password("session-pass"),
            is_active=True,
        )
    )
    await db_session.commit()


async def _login(client: AsyncClient) -> dict[str, Any]:
    response = await client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"username": "session-user", "password": "session-pass"},
    )
    assert response.status_code == 200
    return response.json()["data"]


async def test_logout_revokes_access_and_refresh(
    integration_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _create_user(db_session)
    tokens = await _login(integration_client)

    logout = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/logout",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert logout.status_code == 200

    me = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 401

    refreshed = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refreshed.status_code == 401


async def test_refresh_rotation_revokes_old_pair(
    integration_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _create_user(db_session)
    tokens = await _login(integration_client)

    refreshed = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refreshed.status_code == 200
    new_tokens = refreshed.json()["data"]

    old_me = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert old_me.status_code == 401

    old_refresh = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert old_refresh.status_code == 401

    new_me = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers={"Authorization": f"Bearer {new_tokens['access_token']}"},
    )
    assert new_me.status_code == 200
