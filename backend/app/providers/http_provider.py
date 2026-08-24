"""基于 httpx.AsyncClient 的通用 HTTP Provider 基类。

- 自动将当前 Trace ID 注入下游请求头 `X-Request-ID`，实现全链路追踪。
- 提供统一的 `request_json` 帮助方法，把 httpx 错误归一化为 ProviderException。
- 具体 Provider（Qwen / 爬虫等）继承本类，复用客户端与错误处理。
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.context import get_trace_id
from app.core.exceptions import ProviderException

TRACE_HEADER = "X-Request-ID"


class HttpProvider:
    """通过 HTTP 调用下游服务的通用基类。"""

    def __init__(
        self,
        base_url: str,
        timeout: float = 10.0,
        headers: dict[str, str] | None = None,
    ) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
            headers=headers or {},
            event_hooks={"request": [self._inject_trace_id]},
        )

    async def _inject_trace_id(self, request: httpx.Request) -> None:
        trace_id = get_trace_id()
        if trace_id:
            request.headers.setdefault(TRACE_HEADER, trace_id)

    async def request_json(
        self,
        method: str,
        url: str,
        *,
        json: Any = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """发起请求并返回 JSON dict，错误归一化为 ProviderException。"""
        try:
            response = await self._client.request(method, url, json=json, params=params)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ProviderException(
                f"下游返回错误状态：{exc.response.status_code}",
            ) from exc
        except httpx.HTTPError as exc:
            raise ProviderException(f"下游请求失败：{exc}") from exc
        data: dict[str, Any] = response.json()
        return data

    async def aclose(self) -> None:
        await self._client.aclose()
