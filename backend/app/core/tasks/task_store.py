"""异步任务存储与执行（Redis 状态机 + asyncio 后台执行）。

耗时任务（AI 生成 / 评分 / 优化 / 爬虫检索）统一走此模块：
- 提交任务：生成 task_id，写入 pending 状态，用 asyncio.create_task 后台执行。
- 查询任务：按 task_id 读取 Redis 中的状态与结果。

状态机：pending → running → completed / failed（见需求"全局约定·异步任务状态"）。
Redis Key：`task:{task_type}:{task_id}`，TTL 由配置驱动。

说明：本实现为单进程内 asyncio 执行，满足本期"异步 + 状态查询"诉求；
若后续需要跨进程/持久化调度，可将 _run 替换为 Celery/RQ 派发，接口契约不变。
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from collections.abc import Awaitable, Callable
from enum import StrEnum
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class TaskStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# 后台任务强引用集合，防止 asyncio 任务被 GC 回收
_background_tasks: set[asyncio.Task[None]] = set()


def _cache_key(task_type: str, task_id: str) -> str:
    return f"task:{task_type}:{task_id}"


async def submit_task(
    task_type: str,
    runner: Callable[[], Awaitable[dict[str, Any]]],
) -> str:
    """提交异步任务：写 pending 状态并后台执行，返回 task_id。

    runner 为无参协程工厂，返回结果 dict（completed 时写入 result 字段）。
    runner 需自包含所需依赖（Provider / Session 等），因其在后台协程中执行，
    脱离原请求的依赖注入作用域。
    """
    from app.extensions.redis_ext import get_redis

    task_id = uuid.uuid4().hex
    redis = get_redis()
    key = _cache_key(task_type, task_id)
    ttl = settings.idempotency_ttl_seconds

    await redis.set(
        key,
        json.dumps({"status": TaskStatus.PENDING, "result": None, "error": None}),
        ex=ttl,
    )

    task = asyncio.create_task(_run(task_type, task_id, runner))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return task_id


async def _run(
    task_type: str,
    task_id: str,
    runner: Callable[[], Awaitable[dict[str, Any]]],
) -> None:
    """后台执行任务并回写状态。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    key = _cache_key(task_type, task_id)
    ttl = settings.idempotency_ttl_seconds

    await redis.set(
        key,
        json.dumps({"status": TaskStatus.RUNNING, "result": None, "error": None}),
        ex=ttl,
    )
    try:
        result = await runner()
        await redis.set(
            key,
            json.dumps(
                {"status": TaskStatus.COMPLETED, "result": result, "error": None},
                ensure_ascii=False,
            ),
            ex=ttl,
        )
    except Exception as exc:  # 后台任务需捕获全部异常回写 failed 状态
        logger.exception("async task failed: type=%s id=%s", task_type, task_id)
        await redis.set(
            key,
            json.dumps(
                {"status": TaskStatus.FAILED, "result": None, "error": str(exc)},
                ensure_ascii=False,
            ),
            ex=ttl,
        )


async def get_task(task_type: str, task_id: str) -> dict[str, Any] | None:
    """查询任务状态与结果；不存在返回 None。"""
    from app.extensions.redis_ext import get_redis

    redis = get_redis()
    raw = await redis.get(_cache_key(task_type, task_id))
    if raw is None:
        return None
    decoded = raw.decode() if isinstance(raw, bytes) else raw
    data: dict[str, Any] = json.loads(decoded)
    return data
