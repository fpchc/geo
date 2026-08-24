"""幂等子包：强制幂等 Key 校验依赖。"""

from __future__ import annotations

from app.core.idempotency.idempotency import require_idempotency_key

__all__ = ["require_idempotency_key"]
