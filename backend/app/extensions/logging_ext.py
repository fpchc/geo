"""日志扩展：JSON 结构化 + Trace ID + console/file 双输出。

每条日志包含：timestamp, level, trace_id, module, message, extra。
文件路径 / 轮转大小 / 保留数量均由 pydantic-settings 配置驱动。
"""

from __future__ import annotations

import json
import logging
import os
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from typing import Any

from fastapi import FastAPI

from app.core.config import settings
from app.core.context import get_trace_id

# 标准 LogRecord 内建属性，用于剥离出用户自定义 extra
_RESERVED_ATTRS = frozenset(
    logging.makeLogRecord({}).__dict__.keys() | {"message", "asctime", "taskName"}
)


class JsonFormatter(logging.Formatter):
    """输出结构化 JSON 日志。"""

    def format(self, record: logging.LogRecord) -> str:
        extra: dict[str, Any] = {
            key: value for key, value in record.__dict__.items() if key not in _RESERVED_ATTRS
        }

        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "trace_id": get_trace_id(),
            "module": record.name,
            "message": record.getMessage(),
            "extra": extra,
        }

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


def _build_handlers() -> list[logging.Handler]:
    formatter = JsonFormatter()

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    os.makedirs(settings.log_dir, exist_ok=True)
    file_handler = RotatingFileHandler(
        filename=settings.log_file_path,
        maxBytes=settings.log_max_bytes,
        backupCount=settings.log_backup_count,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    return [console_handler, file_handler]


def init_app(app: FastAPI) -> None:
    """配置根 logger：清空旧 handler，挂载 JSON console/file 输出。"""
    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())

    for handler in list(root.handlers):
        root.removeHandler(handler)

    for handler in _build_handlers():
        root.addHandler(handler)

    # 收敛 uvicorn 自带 handler，统一走根 logger 的 JSON 输出
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
