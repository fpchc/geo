"""健康检查 Schema：存活 / 就绪探针响应。"""

from __future__ import annotations

from pydantic import BaseModel


class HealthOut(BaseModel):
    """存活探针响应。"""

    status: str
    version: str


class ReadinessOut(BaseModel):
    """就绪探针响应；components 为各依赖的连通状态。"""

    status: str
    components: dict[str, str]
