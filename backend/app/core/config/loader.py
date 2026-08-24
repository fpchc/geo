"""扩展与中间件加载逻辑。

- 扩展按 `{module_name}_enabled` 配置开关决定是否加载，并记录耗时。
- 中间件按栈式顺序添加，保证执行链路：
  RequestMiddleware → IdempotencyMiddleware → ExceptionMiddleware → Handler。
"""

from __future__ import annotations

import logging
import time

from fastapi import FastAPI


def initialize_extensions(app: FastAPI) -> None:
    from app.core.config import settings
    from app.extensions import db_ext, logging_ext, minio_ext, redis_ext, route_ext

    extensions = [logging_ext, redis_ext, db_ext, minio_ext, route_ext]

    for extension in extensions:
        module_name = extension.__name__.split(".")[-1]
        is_enable = getattr(settings, f"{module_name}_enabled", True)

        if not is_enable:
            logging.info(f"Skipped {module_name}")
            continue

        start_time = time.perf_counter()
        extension.init_app(app)
        end_time = time.perf_counter()
        logging.info(f"Loaded {module_name} ({round((end_time - start_time) * 1000, 2)} ms)")


def initialize_middlewares(app: FastAPI) -> None:
    from app.middlewares.exception_handler import ExceptionMiddleware
    from app.middlewares.idempotency import IdempotencyMiddleware
    from app.middlewares.request_log import RequestMiddleware

    # 先添加的在内层，后添加的在外层先执行
    # 实际执行链路：RequestMiddleware → IdempotencyMiddleware → ExceptionMiddleware → Handler
    middlewares = [ExceptionMiddleware, IdempotencyMiddleware, RequestMiddleware]
    for middleware in middlewares:
        app.add_middleware(middleware)
