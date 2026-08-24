"""自定义 OpenAPI schema：注入 JWT Bearer 安全方案。

使 Swagger UI 出现 Authorize 按钮，输入的 token 会以
`Authorization: Bearer <token>` 形式附加到「Try it out」请求。
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

_BEARER_SCHEME_NAME = "BearerAuth"


def build_openapi(app: FastAPI) -> dict[str, Any]:
    """构建并缓存带 JWT Bearer 安全方案的 OpenAPI 文档。"""
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    components = schema.setdefault("components", {})
    security_schemes = components.setdefault("securitySchemes", {})
    security_schemes[_BEARER_SCHEME_NAME] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "在此填入 JWT 访问令牌（无需手动加 Bearer 前缀）。",
    }

    # 全局默认安全要求；无需鉴权的端点可在路由处以空 dependencies 覆盖
    schema["security"] = [{_BEARER_SCHEME_NAME: []}]

    app.openapi_schema = schema
    return schema


def setup_openapi(app: FastAPI) -> None:
    """将自定义 openapi 生成器挂载到 app.openapi。"""

    def _openapi() -> dict[str, Any]:
        return build_openapi(app)

    app.openapi = _openapi  # type: ignore[method-assign]
