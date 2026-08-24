"""FastAPI 入口，统筹 lifespan、扩展与中间件加载。

启动顺序：
1. initialize_extensions：按开关加载 logging/redis/db/route 扩展。
2. lifespan startup：依次执行各扩展注册的异步 startup 钩子。
3. initialize_middlewares：装配中间件栈。
关闭时逆序执行 shutdown 钩子，实现优雅启停。
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import (
    initialize_extensions,
    initialize_middlewares,
    settings,
    setup_openapi,
)

logger = logging.getLogger(__name__)

type Hook = Callable[[FastAPI], Awaitable[None]]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    # startup：按注册顺序执行各扩展的异步启动钩子
    startup_hooks: list[Hook] = getattr(app.state, "startup_hooks", [])
    for hook in startup_hooks:
        await hook(app)
    logger.info("application startup complete")

    yield

    # shutdown：逆序执行关闭钩子，关闭阶段尽力而为
    shutdown_hooks: list[Hook] = getattr(app.state, "shutdown_hooks", [])
    for hook in reversed(shutdown_hooks):
        try:
            await hook(app)
        except Exception as exc:
            logger.warning("shutdown hook failed: %s", exc)
    logger.info("application shutdown complete")


def create_app() -> FastAPI:
    """应用工厂：装配扩展、中间件与 lifespan。"""
    # 文档可见性由配置驱动，生产环境强制关闭；关闭时置空 url 即禁用对应端点
    docs_url = settings.docs_url if settings.docs_visible else None
    redoc_url = settings.redoc_url if settings.docs_visible else None
    openapi_url = settings.openapi_url if settings.docs_visible else None

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=settings.app_description,
        debug=settings.debug,
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        contact={
            "name": settings.openapi_contact_name,
            "email": settings.openapi_contact_email,
        },
        license_info={"name": settings.openapi_license_name},
    )

    # 自定义 OpenAPI：注入 JWT Bearer，Swagger UI 显示 Authorize 按钮
    setup_openapi(app)

    # lifespan 钩子收集器，供各扩展在 init_app 阶段追加
    app.state.startup_hooks = []
    app.state.shutdown_hooks = []

    # 先加载扩展（其中 route_ext 注册路由、redis/db 注册 lifespan 钩子）
    initialize_extensions(app)
    # 再装配中间件栈
    initialize_middlewares(app)

    return app


app = create_app()
