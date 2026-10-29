"""日志格式配置与 UTF-8 控制台输出回归测试。"""

from __future__ import annotations

import io
import json
import logging
import sys
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from pydantic import ValidationError

from app.core.config import LogFormat, Settings, settings
from app.core.context import set_trace_id
from app.core.context.context import _trace_id_ctx
from app.extensions import logging_ext
from app.extensions.logging_ext import (
    JsonFormatter,
    TextFormatter,
    _build_formatter,
    _force_utf8,
)


@pytest.fixture(autouse=True)
def _isolate_trace_id() -> Iterator[None]:
    """每个用例前后重置 ContextVar，避免 Trace ID 跨用例泄漏。"""
    token = _trace_id_ctx.set(None)
    yield
    _trace_id_ctx.reset(token)


def _make_record(message: str, **extra: object) -> logging.LogRecord:
    record = logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg=message,
        args=(),
        exc_info=None,
    )
    for key, value in extra.items():
        setattr(record, key, value)
    return record


def test_json_formatter_keeps_chinese_readable() -> None:
    set_trace_id("trace-json")
    output = JsonFormatter().format(_make_record("用户名或密码错误", path="/api/v1/auth/login"))
    payload = json.loads(output)
    assert payload["message"] == "用户名或密码错误"
    assert payload["trace_id"] == "trace-json"
    assert payload["extra"] == {"path": "/api/v1/auth/login"}
    assert "\\u7528" not in output


def test_text_formatter_is_human_readable() -> None:
    set_trace_id("trace-text")
    output = TextFormatter().format(
        _make_record("request completed", method="POST", elapsed_ms=90.1)
    )
    assert "INFO" in output
    assert "[trace-text]" in output
    assert "app.test - request completed" in output
    assert "method=POST" in output
    assert "elapsed_ms=90.1" in output
    assert not output.startswith("{")


def test_text_formatter_keeps_chinese_readable() -> None:
    set_trace_id("trace-cn")
    output = TextFormatter().format(_make_record("用户名或密码错误"))
    assert "用户名或密码错误" in output
    assert "+00:00" in output


def test_text_formatter_escapes_control_characters() -> None:
    set_trace_id("trace-inject")
    newline = chr(10)
    output = TextFormatter().format(
        _make_record(
            "evil" + newline + "INFO forged",
            path="/x%" + newline + "INFO forged",
        )
    )
    assert output.splitlines() == [output]
    escaped_newline = chr(92) + "n"
    assert "evil" + escaped_newline + "INFO forged" in output
    assert "path=/x%" + escaped_newline + "INFO forged" in output


def test_text_formatter_includes_stack_info() -> None:
    record = _make_record("boom")
    record.stack_info = "Stack (most recent call last):"
    assert "Stack (most recent call last):" in TextFormatter().format(record)


def test_build_formatter_follows_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "log_format", LogFormat.TEXT)
    assert isinstance(_build_formatter(), TextFormatter)
    monkeypatch.setattr(settings, "log_format", LogFormat.JSON)
    assert isinstance(_build_formatter(), JsonFormatter)
    # 未经过 pydantic 校验的普通字符串也应生效
    monkeypatch.setattr(settings, "log_format", "text")
    assert isinstance(_build_formatter(), TextFormatter)


def test_settings_reject_unknown_log_format() -> None:
    with pytest.raises(ValidationError):
        Settings(_env_file=None, log_format="yaml")  # type: ignore[arg-type]


def test_json_formatter_drops_uvicorn_color_message() -> None:
    """uvicorn 的 ANSI 着色模板不应泄漏进 extra。"""
    record = _make_record("Started server process [123]")
    record.color_message = "Started server process [" + chr(27) + "[36m%d" + chr(27) + "[0m]"
    output = JsonFormatter().format(record)
    payload = json.loads(output)
    assert payload["extra"] == {}
    assert "\\u001b" not in output
    assert "%d" not in output


def test_text_formatter_drops_uvicorn_color_message() -> None:
    record = _make_record("Started server process [123]")
    record.color_message = "Started server process [" + chr(27) + "[36m%d" + chr(27) + "[0m]"
    output = TextFormatter().format(record)
    assert "color_message" not in output
    assert "\\x1b" not in output
    assert "Started server process [123]" in output


def test_json_formatter_redacts_credentials() -> None:
    """URL 用户信息、键值形态的密码/令牌都不能进日志。"""
    record = _make_record(
        "redis connected: redis://:S3cret@175.178.45.21:6379/5",
        dsn="mysql+aiomysql://app:S3cret@localhost:3306/app",
        headers={"authorization": "Bearer abc.def"},
        elapsed_ms=12.5,
    )
    output = JsonFormatter().format(record)
    payload = json.loads(output)
    assert "S3cret" not in output
    assert "abc.def" not in output
    assert payload["message"] == "redis connected: redis://:***@175.178.45.21:6379/5"
    assert payload["extra"]["dsn"] == "mysql+aiomysql://app:***@localhost:3306/app"
    assert payload["extra"]["headers"] == {"authorization": "***"}
    # 非字符串 extra 的类型不能被脱敏逻辑改掉
    assert payload["extra"]["elapsed_ms"] == 12.5


def test_json_formatter_redacts_secret_named_extra_keys() -> None:
    """凭据字段名本身就是线索：值不带任何凭据特征也要抹掉。"""
    record = _make_record(
        "llm config",
        qwen_api_key="sk-live-abc",
        headers={"X-Api-Key": "abc123"},
        max_tokens=2048,
    )
    payload = json.loads(JsonFormatter().format(record))
    assert payload["extra"]["qwen_api_key"] == "***"
    assert payload["extra"]["headers"] == {"X-Api-Key": "***"}
    # 非凭据布尔式字段名（max_tokens）不受影响
    assert payload["extra"]["max_tokens"] == 2048


def test_redact_handles_prefixed_and_quoted_secret_names() -> None:
    """带前缀的组合字段名与带空格的引号值都要整体抹掉。"""
    output = JsonFormatter().format(
        _make_record('jwt_secret_key=abc123 minio_access_key: "a b c" client_secret="xy"')
    )
    for secret in ("abc123", "a b c", "xy"):
        assert secret not in output


def test_redact_handles_objects_and_url_passwords_with_slash() -> None:
    record = _make_record(
        "redis failed: redis://:ab/cd@host:6379/0",
        error=RuntimeError("redis://:S3cret@h:6379/0"),
    )
    output = JsonFormatter().format(record)
    assert "ab/cd" not in output
    assert "S3cret" not in output
    assert json.loads(output)["message"] == "redis failed: redis://:***@host:6379/0"


def test_redact_does_not_touch_ordinary_prose() -> None:
    message = "Invalid basic credentials for user; bearer token expired"
    assert message in TextFormatter().format(_make_record(message))


def test_force_utf8_survives_closed_stream() -> None:
    stream = io.TextIOWrapper(io.BytesIO(), encoding="ascii")
    stream.close()
    assert _force_utf8(stream) is stream


def test_text_formatter_redacts_credentials() -> None:
    output = TextFormatter().format(
        _make_record("login password=hunter2 Authorization: Bearer abc.def")
    )
    assert "hunter2" not in output
    assert "abc.def" not in output
    assert "password=***" in output
    assert "Bearer ***" in output


def test_json_formatter_redacts_exception_text() -> None:
    try:
        raise RuntimeError("connect failed: redis://:S3cret@127.0.0.1:6379/0")
    except RuntimeError:
        import sys as _sys

        exc_info = _sys.exc_info()
    record = _make_record("boom")
    record.exc_info = exc_info
    output = JsonFormatter().format(record)
    assert "S3cret" not in output
    assert "redis://:***@127.0.0.1:6379/0" in output


def test_log_format_accepts_txt_alias() -> None:
    """配置里写 `txt` 与 `text` 等价，避免启动时校验失败。"""
    assert Settings(_env_file=None, log_format="txt").log_format is LogFormat.TEXT  # type: ignore[arg-type]
    assert Settings(_env_file=None, log_format="text").log_format is LogFormat.TEXT  # type: ignore[arg-type]


class _StreamWithoutReconfigure:
    """模拟第三方重定向的 stdio：只有 buffer，没有 reconfigure。"""

    def __init__(self, buffer: io.BytesIO) -> None:
        self.buffer = buffer


def test_force_utf8_wraps_stream_without_reconfigure() -> None:
    buffer = io.BytesIO()
    stream = _force_utf8(_StreamWithoutReconfigure(buffer))  # type: ignore[arg-type]
    assert stream is not None
    stream.write("用户名或密码错误")
    stream.flush()
    assert buffer.getvalue().decode("utf-8") == "用户名或密码错误"


def test_force_utf8_prevents_backslash_escapes() -> None:
    buffer = io.BytesIO()
    stream = io.TextIOWrapper(buffer, encoding="ascii", errors="backslashreplace")
    _force_utf8(stream)
    stream.write("用户名或密码错误")
    stream.flush()
    data = buffer.getvalue()
    assert data.decode("utf-8") == "用户名或密码错误"
    assert b"\\u7528" not in data


def test_init_app_forces_utf8_streams(monkeypatch: pytest.MonkeyPatch) -> None:
    stream = io.TextIOWrapper(io.BytesIO(), encoding="ascii", errors="backslashreplace")
    monkeypatch.setattr(sys, "stdout", stream)
    monkeypatch.setattr(sys, "stderr", stream)
    monkeypatch.setattr(logging_ext, "_build_handlers", lambda: [])

    root = logging.getLogger()
    original_handlers = list(root.handlers)
    original_level = root.level
    try:
        logging_ext.init_app(FastAPI())
    finally:
        root.handlers = original_handlers
        root.level = original_level

    assert stream.encoding == "utf-8"
