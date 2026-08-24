"""统一业务响应结构：{"code", "message", "data"}。"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

from app.core.exceptions import ErrorCode

T = TypeVar("T")


class BizResponse(BaseModel, Generic[T]):
    """标准业务响应体。"""

    code: int = int(ErrorCode.SUCCESS)
    message: str = "success"
    data: T | None = None

    @classmethod
    def ok(cls, data: T | None = None, message: str = "success") -> BizResponse[T]:
        return cls(code=int(ErrorCode.SUCCESS), message=message, data=data)

    @classmethod
    def fail(
        cls,
        code: ErrorCode,
        message: str,
        data: T | None = None,
    ) -> BizResponse[T]:
        return cls(code=int(code), message=message, data=data)
