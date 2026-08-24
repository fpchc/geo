"""健康检查端点测试。"""

from __future__ import annotations

from httpx import AsyncClient

from app.core.config import settings


async def test_health_liveness(client: AsyncClient) -> None:
    resp = await client.get(f"{settings.api_v1_prefix}/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"] == settings.app_version
