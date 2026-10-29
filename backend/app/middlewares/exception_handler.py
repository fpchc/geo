"""ExceptionMiddleware：全局异常捕获并转成统一 JSON 响应。

统一响应结构：{"code": <int>, "message": <str>, "data": <any>}。
- AppException     → 使用其 http_status / error_code / message。
- 其它未捕获异常   → 500 + UNKNOWN_ERROR，记录堆栈。
"""

from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.exceptions import AppException, ErrorCode

logger = logging.getLogger(__name__)


class ExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        try:
            return await call_next(request)
        except AppException as exc:
            logger.warning(
                "business exception: %s",
                exc.message,
                extra={"error_code": int(exc.error_code), "path": request.url.path},
            )
            return JSONResponse(
                status_code=exc.http_status,
                content={
                    "code": int(exc.error_code),
                    "message": exc.message,
                    "data": exc.data,
                },
                headers=exc.headers,
            )
        except Exception as exc:
            logger.exception("unhandled exception: %s", exc)
            return JSONResponse(
                status_code=500,
                content={
                    "code": int(ErrorCode.UNKNOWN_ERROR),
                    "message": "服务器内部错误",
                    "data": None,
                },
            )
