"""日志扩展：JSON/文本可配置 + Trace ID + console/file 双输出。

每条日志包含：timestamp, level, trace_id, module, message, extra。
格式（LOG_FORMAT）与文件路径 / 轮转大小 / 保留数量均由 pydantic-settings 驱动。
"""

from __future__ import annotations

import contextlib
import io
import json
import logging
import os
import re
import sys
from datetime import UTC, datetime
from logging.handlers import RotatingFileHandler
from typing import Any, TextIO

from fastapi import FastAPI

from app.core.config import LogFormat, settings
from app.core.context import get_trace_id

# 标准 LogRecord 内建属性，用于剥离出用户自定义 extra
_RESERVED_ATTRS = frozenset(
    logging.makeLogRecord({}).__dict__.keys() | {"message", "asctime", "taskName"}
)

# uvicorn 会把自己使用的 ANSI 着色模板塞进 extra；我们的 formatter 不消费它，
# 原样输出会得到 "[\u001b[36m%d\u001b[0m]" 这类未格式化的乱码片段。
_IGNORED_EXTRA_KEYS = frozenset({"color_message"})

_REDACTED = "***"

# scheme://user:password@host —— 保留账号，抹掉密码（用户名可能为空，如 redis://:pwd@host）
# 密码段用贪婪的 \S* 并回溯到最后一个 @，以覆盖密码里带 / 或 @ 的情况
_URL_USERINFO_RE = re.compile(
    r"(?P<prefix>[A-Za-z][A-Za-z0-9+.\-]*://)(?P<user>[^:/@\s]*):(?P<password>\S*)@"
)
# Authorization: Bearer xxx / Basic xxx；要求令牌含数字或符号，避免把
# "Invalid basic credentials" 这类普通文案当成凭据
_AUTH_SCHEME_RE = re.compile(
    r"(?i)\b(?P<scheme>Bearer|Basic)\s+"
    r"(?=[A-Za-z0-9\-._~+/]*[0-9\-._~+=/])[A-Za-z0-9\-._~+/]{6,}=*"
)
# password=xxx / "api_key": "xxx" 之流；前缀允许 jwt_secret_key、DB_PASSWORD 这类组合名
_SECRET_ASSIGNMENT_RE = re.compile(
    r"(?i)(?P<prefix>(?<![A-Za-z0-9])(?:password|passwd|pwd|secret[_-]?key|secret|token|"
    r"api[_-]?key|access[_-]?key|private[_-]?key)\b[\"']?\s*[=:]\s*)"
    r"(?:(?P<quote>[\"'])(?P<quoted>[^\"']*)(?P=quote)|(?P<bare>[^\"'\s,;&}]+))"
)
# extra 的 key 本身是凭据字段名时，值无论形态都要抹掉（如 extra={"qwen_api_key": "..."}）
_SECRET_NAME_RE = re.compile(
    r"(?i)(?:^|[_-])(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|"
    r"secret[_-]?key|private[_-]?key|authorization)$"
)
# 这些原始类型保持原值，避免脱敏把数字变成字符串
_SCALAR_TYPES = (int, float, bool)


def _record_extra(record: logging.LogRecord) -> dict[str, Any]:
    """剥离标准属性，返回用户通过 ``extra=`` 传入的字段。"""
    return {
        key: value
        for key, value in record.__dict__.items()
        if key not in _RESERVED_ATTRS and key not in _IGNORED_EXTRA_KEYS
    }


def _mask_assignment(match: re.Match[str]) -> str:
    """保留 key 与引号，只替换赋值右侧的值。"""
    prefix = match.group("prefix")
    quote = match.group("quote")
    if quote:
        return f"{prefix}{quote}{_REDACTED}{quote}"
    return f"{prefix}{_REDACTED}"


def _redact(value: str) -> str:
    """抹掉文本中的密码、令牌等凭据，避免明文落盘或上屏。"""
    value = _AUTH_SCHEME_RE.sub(lambda match: f"{match.group('scheme')} {_REDACTED}", value)
    value = _URL_USERINFO_RE.sub(
        lambda match: f"{match.group('prefix')}{match.group('user')}:{_REDACTED}@", value
    )
    return _SECRET_ASSIGNMENT_RE.sub(_mask_assignment, value)


def _redact_value(value: Any) -> Any:
    """递归脱敏 extra：字符串走文本规则，凭据字段名的值一律替换。

    非字符串标量保持原类型；其余对象（异常、模型等）会被 downstream
    的 ``str()`` / ``default=str`` 序列化，因此先按文本脱敏。
    """
    if isinstance(value, str):
        return _redact(value)
    if isinstance(value, dict):
        return {
            key: (
                _REDACTED
                if isinstance(key, str) and _SECRET_NAME_RE.search(key)
                else _redact_value(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list | tuple):
        return [_redact_value(item) for item in value]
    if value is None or isinstance(value, _SCALAR_TYPES):
        return value
    return _redact(str(value))


def _escape_control(value: str) -> str:
    """转义控制字符，防止换行等字符伪造文本日志行。"""
    return "".join(
        char if char.isprintable() else char.encode("unicode_escape").decode("ascii")
        for char in value
    )


class JsonFormatter(logging.Formatter):
    """输出结构化 JSON 日志。"""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "trace_id": get_trace_id(),
            "module": record.name,
            "message": _redact(record.getMessage()),
            "extra": _redact_value(_record_extra(record)),
        }

        if record.exc_info:
            payload["exc_info"] = _redact(self.formatException(record.exc_info))
        if record.stack_info:
            payload["stack_info"] = _redact(self.formatStack(record.stack_info))

        return json.dumps(payload, ensure_ascii=False, default=str)


class TextFormatter(logging.Formatter):
    """输出人类可读的单行文本日志（含 Trace ID 与 extra）。"""

    def format(self, record: logging.LogRecord) -> str:
        extra = _redact_value(_record_extra(record))

        # 与 JSON 格式统一使用 UTC，并显式携带时区偏移
        timestamp = datetime.fromtimestamp(record.created, tz=UTC).isoformat(
            sep=" ", timespec="milliseconds"
        )
        trace_id = get_trace_id() or "-"
        message = _escape_control(_redact(record.getMessage()))
        line = f"{timestamp} {record.levelname:<8} [{trace_id}] {record.name} - {message}"

        if extra:
            fields = " ".join(
                f"{key}={_escape_control(str(value))}" for key, value in extra.items()
            )
            line += " " + fields

        if record.exc_info:
            line += "\n" + _redact(self.formatException(record.exc_info))
        if record.stack_info:
            line += "\n" + _redact(self.formatStack(record.stack_info))

        return line


def _force_utf8(stream: TextIO | None) -> TextIO | None:
    """把标准流固定为 UTF-8，并返回实际可用的流。

    stderr 默认错误处理器为 backslashreplace：编码无法表示中文时会输出
    ``\\u7528\\u6237`` 而不是报错，这里统一改为 UTF-8 从源头消除该现象。
    流不支持 ``reconfigure``（第三方重定向对象）时，在 ``stream.buffer``
    上重新包一层 UTF-8 文本流，而不是静默放弃。
    """
    if stream is None:
        return None

    reconfigure = getattr(stream, "reconfigure", None)
    if reconfigure is not None:
        try:
            reconfigure(encoding="utf-8", errors="backslashreplace")
            return stream
        except (OSError, ValueError):
            # pytest capture / 已关闭或分离的流无法 reconfigure，退回到包装方案
            pass

    buffer = getattr(stream, "buffer", None)
    if buffer is None:
        return stream

    try:
        return io.TextIOWrapper(
            buffer,
            encoding="utf-8",
            errors="backslashreplace",
            line_buffering=True,
            write_through=True,
        )
    except (OSError, ValueError):
        # 底层流已关闭等场景：保持原样，不要让日志初始化拖垮启动
        return stream


def _is_tty(stream: TextIO | None) -> bool:
    if stream is None:
        return False
    try:
        return stream.isatty()
    except (OSError, ValueError):
        return False


def _force_console_codepage() -> None:
    """Windows 控制台默认代码页可能是 GBK，UTF-8 字节会被按错代码页渲染成乱码。

    仅在 stdio 真的是终端时切换；重定向到管道 / 文件时交由下游按 UTF-8 处理。
    stdout 与 stderr 都可能被独立重定向，任一是终端都需要切换。
    """
    if sys.platform != "win32":
        return
    if not (_is_tty(sys.stdout) or _is_tty(sys.stderr)):
        return

    with contextlib.suppress(AttributeError, OSError):
        import ctypes

        ctypes.windll.kernel32.SetConsoleOutputCP(65001)


def _build_formatter() -> logging.Formatter:
    """按 ``settings.log_format`` 选择 JSON 或文本格式。"""
    if settings.log_format == LogFormat.TEXT:
        return TextFormatter()
    return JsonFormatter()


def _build_handlers() -> list[logging.Handler]:
    formatter = _build_formatter()

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
    """配置根 logger：清空旧 handler，按配置挂载 console/file 输出。"""
    # 标准流先固定为 UTF-8，console handler 会继承该编码
    _force_console_codepage()
    sys.stdout = _force_utf8(sys.stdout) or sys.stdout
    sys.stderr = _force_utf8(sys.stderr) or sys.stderr

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
