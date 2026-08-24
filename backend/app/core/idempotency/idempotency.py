"""幂等 Key 强制校验依赖。

强制幂等接口（资金 / 外呼 / 生成流水号类）在路由 dependencies 中挂
`Depends(require_idempotency_key)`：缺失或非法 Key 时直接 400，业务函数不会执行。

Key 规则（见 /endpoint-idempotency）：长度 1~128，字符集 [A-Za-z0-9_-]。
真正的幂等去重（Redis 缓存/重放）由 IdempotencyMiddleware 统一完成，此处只做校验。
"""

from __future__ import annotations

import re

from starlette.requests import Request

from app.core.exceptions import IdempotencyKeyInvalidException

_IDEMPOTENCY_HEADER = "X-Idempotency-Key"
_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


async def require_idempotency_key(request: Request) -> str:
    """校验并返回 X-Idempotency-Key，非法时抛 400。"""
    key = request.headers.get(_IDEMPOTENCY_HEADER)
    if not key or not _KEY_PATTERN.match(key):
        raise IdempotencyKeyInvalidException()
    return key
