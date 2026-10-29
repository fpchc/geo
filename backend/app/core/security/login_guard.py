"""登录守卫：在凭据校验前执行登录限流与失败锁定。

- IP 限流：固定窗口，Redis Lua 原子 INCR + EXPIRE。
- 失败锁定：按用户名的失败计数；达到阈值后写入锁定 key。
对外接口保持小面：check / record_failure / reset。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, cast

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from app.core.exceptions import ServiceUnavailableException

type LoginBlockReason = Literal["rate_limited", "locked"]

# INCR 并只在首次计数时设置过期，保证窗口固定且计数原子。
_RATE_LIMIT_LUA = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {current, redis.call('TTL', KEYS[1])}
"""

# 失败计数 + 达阈值写锁定 key；两步在同一脚本内完成，避免并发漏锁。
_FAILURE_LUA = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
if current >= tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'EX', ARGV[3])
end
return current
"""


@dataclass(frozen=True, slots=True)
class LoginGuardConfig:
    """登录守卫的阈值与 key 前缀。"""

    rate_limit: int
    rate_window_seconds: int
    rate_key_prefix: str
    failure_threshold: int
    failure_window_seconds: int
    lockout_seconds: int
    failure_key_prefix: str
    lock_key_prefix: str


@dataclass(frozen=True, slots=True)
class LoginDecision:
    """登录守卫的判定结果。"""

    allowed: bool
    retry_after: int = 0
    reason: LoginBlockReason | None = None


def evaluate_rate_limit(*, count: int, limit: int, ttl: int) -> LoginDecision:
    """纯阈值判断：未超限放行，超限返回至少 1 秒的等待时间。"""
    if count <= limit:
        return LoginDecision(allowed=True)
    return LoginDecision(
        allowed=False,
        retry_after=max(ttl, 1),
        reason="rate_limited",
    )


def evaluate_lockout(*, ttl: int) -> LoginDecision:
    """锁定 key 不存在（TTL=-2）时放行；无过期时间（-1）也按锁定处理。"""
    if ttl == -2:
        return LoginDecision(allowed=True)
    return LoginDecision(
        allowed=False,
        retry_after=max(ttl, 1),
        reason="locked",
    )


class LoginGuard:
    """登录防护深模块：IP 限流 + 用户名失败锁定。"""

    def __init__(self, redis: aioredis.Redis[bytes], config: LoginGuardConfig) -> None:
        self._redis = redis
        self._config = config

    async def check(self, client_ip: str, username: str) -> LoginDecision:
        """依次检查 IP 限流与用户名锁定。"""
        try:
            rate_decision = await self._check_rate_limit(client_ip)
            if not rate_decision.allowed:
                return rate_decision
            lock_ttl = await self._redis.ttl(f"{self._config.lock_key_prefix}:{username}")
        except RedisError as exc:
            raise ServiceUnavailableException("登录防护服务暂不可用") from exc
        return evaluate_lockout(ttl=lock_ttl)

    async def record_failure(self, client_ip: str, username: str) -> None:
        """记录一次失败；达到阈值时写入锁定 key。"""
        failure_key = f"{self._config.failure_key_prefix}:{username}"
        lock_key = f"{self._config.lock_key_prefix}:{username}"
        try:
            await self._redis.eval(  # type: ignore[no-untyped-call]
                _FAILURE_LUA,
                2,
                failure_key,
                lock_key,
                self._config.failure_window_seconds,
                self._config.failure_threshold,
                self._config.lockout_seconds,
            )
        except RedisError as exc:
            raise ServiceUnavailableException("登录防护服务暂不可用") from exc

    async def reset(self, username: str) -> None:
        """登录成功时清零失败计数与锁定标记。"""
        try:
            await self._redis.delete(
                f"{self._config.failure_key_prefix}:{username}",
                f"{self._config.lock_key_prefix}:{username}",
            )
        except RedisError as exc:
            raise ServiceUnavailableException("登录防护服务暂不可用") from exc

    async def _check_rate_limit(self, client_ip: str) -> LoginDecision:
        key = f"{self._config.rate_key_prefix}:{client_ip}"
        raw: Any = await self._redis.eval(  # type: ignore[no-untyped-call]
            _RATE_LIMIT_LUA,
            1,
            key,
            self._config.rate_window_seconds,
        )
        count, ttl = cast("list[int]", raw)
        return evaluate_rate_limit(
            count=count,
            limit=self._config.rate_limit,
            ttl=ttl,
        )


__all__ = [
    "LoginBlockReason",
    "LoginDecision",
    "LoginGuard",
    "LoginGuardConfig",
    "evaluate_lockout",
    "evaluate_rate_limit",
]
