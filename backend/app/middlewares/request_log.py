"""RequestMiddleware：最外层生成 Trace ID、计时并记录访问日志。

- 从请求头读取 X-Request-ID，缺失则生成新的 UUID。
- 注入 contextvars，供全链路日志与下游 Provider 使用。
- 在响应头回写 X-Request-ID，并记录处理耗时。
"""

from __future__ import annotations

import logging
import time

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.context import new_trace_id, set_current_user, set_trace_id

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "x-request-id"


class RequestMiddleware:
    """纯 ASGI 中间件，保证 contextvars 在同一任务上下文内传播。"""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers") or [])
        incoming = headers.get(REQUEST_ID_HEADER.encode())
        trace_id = incoming.decode() if incoming else new_trace_id()

        set_trace_id(trace_id)
        set_current_user(None)

        start_time = time.perf_counter()

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                raw_headers = message.setdefault("headers", [])
                raw_headers.append((REQUEST_ID_HEADER.encode(), trace_id.encode()))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(
                "request completed",
                extra={
                    "method": scope.get("method"),
                    "path": scope.get("path"),
                    "elapsed_ms": elapsed_ms,
                },
            )
