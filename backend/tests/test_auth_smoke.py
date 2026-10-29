"""认证集成冒烟测试：完整 lifespan + 真实 Redis/MySQL。"""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.models.rbac import User


async def test_login_smoke(
    integration_client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    user = User(
        username="smoke-user",
        hashed_password=await hash_password("smoke-pass"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    response = await integration_client.post(
        f"{settings.api_v1_prefix}/auth/login",
        json={"username": "smoke-user", "password": "smoke-pass"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 0
    assert body["data"]["access_token"]
    assert body["data"]["refresh_token"]
    assert body["data"]["token_type"] == "bearer"
