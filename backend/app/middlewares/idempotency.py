"""IdempotencyMiddleware：基于 X-Idempotency-Key + Redis 的幂等去重。

生效条件：写方法（POST/PUT/PATCH/DELETE）且请求头含 X-Idempotency-Key。
Redis Key：`idem:{method}:{path}:{key}`，TTL 由配置驱动（默认 24h）。

状态机：
- 首次：SETNX 占位 -> 处理 -> 缓存 status/body/headers -> 返回。
- 重复（已完成）：直接返回缓存内容，附加 X-Idempotent-Replay: true。
- 处理中（占位存在但无结果）：返回 409 + IDEMPOTENT_IN_PROGRESS。
"""

from __future__ import annotations

import json
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.exceptions import ErrorCode

_WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
_IDEMPOTENCY_HEADER = "x-idempotency-key"
_STATE_IN_PROGRESS = "__in_progress__"


class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        idem_key = request.headers.get(_IDEMPOTENCY_HEADER)
        if request.method not in _WRITE_METHODS or not idem_key:
            return await call_next(request)

        # 延迟导入，避免在 redis 扩展未启用时的强依赖
        from app.extensions.redis_ext import get_redis

        redis = get_redis()
        cache_key = f"idem:{request.method}:{request.url.path}:{idem_key}"
        ttl = settings.idempotency_ttl_seconds

        # 尝试占位：SETNX，成功说明是首次请求
        acquired = await redis.set(cache_key, _STATE_IN_PROGRESS, nx=True, ex=ttl)

        if not acquired:
            cached_raw = await redis.get(cache_key)
            cached = cached_raw.decode() if isinstance(cached_raw, bytes) else cached_raw
            if cached is None or cached == _STATE_IN_PROGRESS:
                # 仍在处理中，拒绝并发重复提交
                return JSONResponse(
                    status_code=409,
                    content={
                        "code": int(ErrorCode.IDEMPOTENT_IN_PROGRESS),
                        "message": "请求正在处理中，请勿重复提交",
                        "data": None,
                    },
                )
            return self._build_replay_response(cached)

        # 首次请求：真正执行处理链
        try:
            response = await call_next(request)
        except Exception:
            # 处理失败时清除占位，允许客户端重试
            await redis.delete(cache_key)
            raise

        body = await self._read_response_body(response)
        await self._store_response(redis, cache_key, response, body, ttl)

        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

    @staticmethod
    async def _read_response_body(response: Response) -> bytes:
        chunks: list[bytes] = []
        async for chunk in response.body_iterator:  # type: ignore[attr-defined]
            chunks.append(chunk if isinstance(chunk, bytes) else chunk.encode())
        return b"".join(chunks)

    @staticmethod
    async def _store_response(
        redis: Any,
        cache_key: str,
        response: Response,
        body: bytes,
        ttl: int,
    ) -> None:
        snapshot = {
            "status_code": response.status_code,
            "headers": dict(response.headers.items()),
            "body": body.decode("utf-8", errors="replace"),
        }
        await redis.set(cache_key, json.dumps(snapshot, ensure_ascii=False), ex=ttl)

    @staticmethod
    def _build_replay_response(cached: str) -> Response:
        snapshot: dict[str, Any] = json.loads(cached)
        headers = dict(snapshot.get("headers", {}))
        headers["X-Idempotent-Replay"] = "true"
        # 移除长度头，交由 Starlette 依据新 body 重算
        headers.pop("content-length", None)
        return Response(
            content=snapshot.get("body", ""),
            status_code=int(snapshot.get("status_code", 200)),
            headers=headers,
        )
