"""扩展基类接口定义。

每个扩展模块以模块级函数形式提供：
- init_app(app)  : 同步初始化（loader 反射调用）
- startup(app)   : 异步启动钩子（可选，接入 lifespan）
- shutdown(app)  : 异步关闭钩子（可选，接入 lifespan）
"""

from __future__ import annotations

from typing import Protocol

from fastapi import FastAPI


class Extension(Protocol):
    """扩展模块协议（供类型检查参考）。"""

    __name__: str

    def init_app(self, app: FastAPI) -> None: ...
