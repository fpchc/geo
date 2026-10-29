"""请求级上下文：基于 contextvars 存储 Trace ID 与当前用户。

在 async 场景下 contextvars 天然隔离每个协程任务，安全传递全链路信息。
"""

from __future__ import annotations

import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field

# Trace ID：由 RequestMiddleware 在最外层生成
_trace_id_ctx: ContextVar[str | None] = ContextVar("trace_id", default=None)


@dataclass(slots=True)
class CurrentUser:
    """当前登录用户的最小上下文快照。"""

    user_id: int
    username: str
    is_superuser: bool = False
    role_ids: tuple[int, ...] = ()
    permission_codes: frozenset[str] = field(default_factory=frozenset)
    # 当前 access token 的 jti，用于 logout 精确吊销该会话
    access_jti: str | None = None

    def has_permission(self, code: str) -> bool:
        return code in self.permission_codes


_current_user_ctx: ContextVar[CurrentUser | None] = ContextVar("current_user", default=None)


def new_trace_id() -> str:
    """生成新的 Trace ID（UUID4 十六进制）。"""
    return uuid.uuid4().hex


def set_trace_id(trace_id: str) -> None:
    _trace_id_ctx.set(trace_id)


def get_trace_id() -> str | None:
    return _trace_id_ctx.get()


def set_current_user(user: CurrentUser | None) -> None:
    _current_user_ctx.set(user)


def get_current_user_ctx() -> CurrentUser | None:
    return _current_user_ctx.get()
