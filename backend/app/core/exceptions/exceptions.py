"""自定义异常与统一响应错误码。

所有业务异常继承 `AppException`；错误码集中登记在 `ErrorCode`，禁止散落硬编码。
`ExceptionMiddleware` 负责将异常转成 `{"code", "message", "data"}` 结构。
"""

from __future__ import annotations

from enum import IntEnum
from typing import Any


class ErrorCode(IntEnum):
    """集中登记的业务错误码。"""

    SUCCESS = 0
    # 通用
    UNKNOWN_ERROR = 10000
    VALIDATION_ERROR = 10001
    NOT_FOUND = 10002
    CONFLICT = 10003
    # 认证授权
    UNAUTHORIZED = 20001
    PERMISSION_DENIED = 20002
    TOKEN_EXPIRED = 20003
    TOKEN_INVALID = 20004
    LOGIN_RATE_LIMITED = 20005
    LOGIN_LOCKED = 20006
    # 幂等
    IDEMPOTENT_IN_PROGRESS = 30001
    IDEMPOTENT_KEY_CONFLICT = 30002
    IDEMPOTENT_KEY_INVALID = 30003
    # 依赖 / 下游
    PROVIDER_ERROR = 40001
    SERVICE_UNAVAILABLE = 40002
    STORAGE_ERROR = 40003
    LLM_ERROR = 40004
    CRAWLER_ERROR = 40005


class AppException(Exception):
    """业务异常基类。所有自定义异常必须继承本类。"""

    http_status: int = 400
    error_code: ErrorCode = ErrorCode.UNKNOWN_ERROR
    message: str = "服务异常"

    def __init__(
        self,
        message: str | None = None,
        *,
        data: Any = None,
        error_code: ErrorCode | None = None,
        http_status: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.message = message or self.message
        self.data = data
        self.headers = headers
        if error_code is not None:
            self.error_code = error_code
        if http_status is not None:
            self.http_status = http_status
        super().__init__(self.message)


class ValidationException(AppException):
    http_status = 422
    error_code = ErrorCode.VALIDATION_ERROR
    message = "参数校验失败"


class NotFoundException(AppException):
    http_status = 404
    error_code = ErrorCode.NOT_FOUND
    message = "资源不存在"


class ConflictException(AppException):
    http_status = 409
    error_code = ErrorCode.CONFLICT
    message = "资源冲突"


class UnauthorizedException(AppException):
    http_status = 401
    error_code = ErrorCode.UNAUTHORIZED
    message = "未认证或认证失败"


class TokenExpiredException(UnauthorizedException):
    error_code = ErrorCode.TOKEN_EXPIRED
    message = "令牌已过期"


class TokenInvalidException(UnauthorizedException):
    error_code = ErrorCode.TOKEN_INVALID
    message = "令牌无效"


class LoginRateLimitedException(AppException):
    """登录请求超过限流阈值。"""

    http_status = 429
    error_code = ErrorCode.LOGIN_RATE_LIMITED
    message = "尝试次数过多，请稍后再试"

    def __init__(self, *, retry_after: int) -> None:
        super().__init__(headers={"Retry-After": str(max(retry_after, 1))})


class LoginLockedException(AppException):
    """用户名连续失败达到阈值，进入锁定。"""

    http_status = 429
    error_code = ErrorCode.LOGIN_LOCKED
    message = "尝试次数过多，请稍后再试"

    def __init__(self, *, retry_after: int) -> None:
        super().__init__(headers={"Retry-After": str(max(retry_after, 1))})


class PermissionDeniedException(AppException):
    http_status = 403
    error_code = ErrorCode.PERMISSION_DENIED
    message = "无访问权限"


class IdempotentInProgressException(AppException):
    http_status = 409
    error_code = ErrorCode.IDEMPOTENT_IN_PROGRESS
    message = "请求正在处理中，请勿重复提交"


class IdempotencyKeyInvalidException(AppException):
    http_status = 400
    error_code = ErrorCode.IDEMPOTENT_KEY_INVALID
    message = "幂等 Key 缺失、长度或字符非法"


class ProviderException(AppException):
    http_status = 502
    error_code = ErrorCode.PROVIDER_ERROR
    message = "下游服务调用失败"


class ServiceUnavailableException(AppException):
    http_status = 503
    error_code = ErrorCode.SERVICE_UNAVAILABLE
    message = "服务暂不可用"


class StorageException(AppException):
    """对象存储（MinIO）调用失败。"""

    http_status = 502
    error_code = ErrorCode.STORAGE_ERROR
    message = "对象存储调用失败"


class LLMException(AppException):
    """大模型（Qwen / 审判官）调用失败，通常可重试。"""

    http_status = 502
    error_code = ErrorCode.LLM_ERROR
    message = "大模型调用失败"


class CrawlerException(AppException):
    """爬虫 / 搜索引擎检索失败，通常可重试。"""

    http_status = 502
    error_code = ErrorCode.CRAWLER_ERROR
    message = "命中检索调用失败"
