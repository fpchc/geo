"""Provider 依赖注入 Mock 测试示例。

演示如何用 app.dependency_overrides 将真实 Provider 替换为可控 Mock，
无需任何外部网络调用即可覆盖依赖注入路径。
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.providers import ExampleProvider, get_example_provider


class _FakeProvider:
    """测试专用 Provider，实现 ExampleProvider 协议。"""

    def __init__(self, payload: dict[str, Any]) -> None:
        self._payload = payload
        self.closed = False

    async def fetch_resource(self, resource_id: str) -> dict[str, Any]:
        return {"id": resource_id, **self._payload}

    async def aclose(self) -> None:
        self.closed = True


@pytest.fixture
def provider_app() -> FastAPI:
    app = FastAPI()

    @app.get("/demo/{resource_id}")
    async def demo(
        resource_id: str,
        provider: ExampleProvider = Depends(get_example_provider),
    ) -> dict[str, Any]:
        return await provider.fetch_resource(resource_id)

    return app


async def test_provider_override(provider_app: FastAPI) -> None:
    fake = _FakeProvider({"source": "fake", "value": 99})

    async def _override() -> ExampleProvider:
        return fake

    provider_app.dependency_overrides[get_example_provider] = _override

    transport = ASGITransport(app=provider_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/demo/abc")

    assert resp.status_code == 200
    body = resp.json()
    assert body == {"id": "abc", "source": "fake", "value": 99}

    provider_app.dependency_overrides.clear()


def test_fake_provider_satisfies_protocol() -> None:
    fake = _FakeProvider({})
    # runtime_checkable Protocol：验证 Mock 结构兼容
    assert isinstance(fake, ExampleProvider)
