"""禁用/删除用户撤销全部会话集成测试（需要 MySQL/Redis）。"""

from __future__ import annotations

from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.rbac import User


async def _create_user(
    db_session: AsyncSession,
    username: str,
    password: str,
    *,
    is_superuser: bool = False,
) -> User:
    user = User(
        username=username,
        hashed_password=await hash_password(password),
        is_active=True,
        is_superuser=is_superuser,
    )
    db_session.add(user)
    await db_session.commit()
    return user


async def _login(client: AsyncClient, username: str, password: str) -> dict[str, Any]:
    response = await client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"username": username, "password": password},
    )
    assert response.status_code == 200
    return response.json()["data"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_disable_user_revokes_all_sessions(
    integration_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _create_user(db_session, "admin-user", "admin-pass", is_superuser=True)
    target = await _create_user(db_session, "target-user", "target-pass")
    admin_tokens = await _login(integration_client, "admin-user", "admin-pass")
    target_tokens = await _login(integration_client, "target-user", "target-pass")

    disable = await integration_client.put(
        f"{settings.api_v1_prefix}/users/{target.id}",
        headers=_auth(admin_tokens["access_token"]),
        json={"is_active": False},
    )
    assert disable.status_code == 200

    me = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers=_auth(target_tokens["access_token"]),
    )
    assert me.status_code == 401

    refreshed = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/refresh",
        json={"refresh_token": target_tokens["refresh_token"]},
    )
    assert refreshed.status_code == 401

    enable = await integration_client.put(
        f"{settings.api_v1_prefix}/users/{target.id}",
        headers=_auth(admin_tokens["access_token"]),
        json={"is_active": True},
    )
    assert enable.status_code == 200
    still_revoked = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers=_auth(target_tokens["access_token"]),
    )
    assert still_revoked.status_code == 401


async def test_delete_user_revokes_all_sessions(
    integration_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _create_user(db_session, "admin-user", "admin-pass", is_superuser=True)
    target = await _create_user(db_session, "delete-user", "delete-pass")
    admin_tokens = await _login(integration_client, "admin-user", "admin-pass")
    target_tokens = await _login(integration_client, "delete-user", "delete-pass")

    deleted = await integration_client.delete(
        f"{settings.api_v1_prefix}/users/{target.id}",
        headers=_auth(admin_tokens["access_token"]),
    )
    assert deleted.status_code == 200

    me = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers=_auth(target_tokens["access_token"]),
    )
    assert me.status_code == 401

    refreshed = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/refresh",
        json={"refresh_token": target_tokens["refresh_token"]},
    )
    assert refreshed.status_code == 401


async def test_unrelated_update_does_not_revoke_sessions(
    integration_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await _create_user(db_session, "admin-user", "admin-pass", is_superuser=True)
    target = await _create_user(db_session, "nickname-user", "nickname-pass")
    admin_tokens = await _login(integration_client, "admin-user", "admin-pass")
    target_tokens = await _login(integration_client, "nickname-user", "nickname-pass")

    updated = await integration_client.put(
        f"{settings.api_v1_prefix}/users/{target.id}",
        headers=_auth(admin_tokens["access_token"]),
        json={"nickname": "new-nickname"},
    )
    assert updated.status_code == 200

    me = await integration_client.get(
        f"{settings.api_v1_prefix}/auth/me",
        headers=_auth(target_tokens["access_token"]),
    )
    assert me.status_code == 200
