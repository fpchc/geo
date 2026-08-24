"""路由扩展：注册三端（admin / demand / supplier）API 路由。"""

from __future__ import annotations

import logging

from fastapi import FastAPI

from app.api import api_router
from app.core.config import settings

logger = logging.getLogger(__name__)


def init_app(app: FastAPI) -> None:
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    logger.info("routes mounted under prefix %s", settings.api_v1_prefix)
