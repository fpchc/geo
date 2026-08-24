"""扩展模块重导出。

loader.initialize_extensions 依赖此处导出的模块对象，
其 __name__ 末段（如 `logging_ext`）用于反射 `{module_name}_enabled` 开关。
"""

from __future__ import annotations

from app.extensions import db_ext, logging_ext, minio_ext, redis_ext, route_ext

__all__ = ["db_ext", "logging_ext", "minio_ext", "redis_ext", "route_ext"]
