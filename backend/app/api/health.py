"""健康检查端点。

- GET /health       : 存活探针（liveness）。
- GET /health/ready : 就绪探针（readiness），检测 Redis + DB 连通性。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.db import get_db
from app.core.config import settings

router = APIRouter(tags=["system:health"])


@router.get("/health", summary="存活探针")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.app_version}


@router.get("/health/ready", summary="就绪探针")
async def health_ready(session: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    components: dict[str, str] = {}

    # DB
    try:
        await session.execute(text("SELECT 1"))
        components["database"] = "ok"
    except Exception as exc:
        components["database"] = f"error: {exc}"

    # Redis
    try:
        from app.extensions.redis_ext import get_redis

        await get_redis().ping()
        components["redis"] = "ok"
    except Exception as exc:
        components["redis"] = f"error: {exc}"

    overall = "ok" if all(v == "ok" for v in components.values()) else "degraded"
    return {"status": overall, "components": components}
