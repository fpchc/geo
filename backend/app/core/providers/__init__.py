"""Provider 注册中心子包（依赖注入，运行时切换）。

对外统一从包级导入：抽象 Protocol、Mock 实现、构建工厂、FastAPI 依赖。
"""

from __future__ import annotations

from app.core.providers.provider_registry import (
    CrawlerProvider,
    ExampleProvider,
    LLMProvider,
    MockProvider,
    StorageProvider,
    build_provider,
    get_crawler_provider,
    get_example_provider,
    get_llm_provider,
    get_storage_provider,
)

__all__ = [
    "CrawlerProvider",
    "ExampleProvider",
    "LLMProvider",
    "MockProvider",
    "StorageProvider",
    "build_provider",
    "get_crawler_provider",
    "get_example_provider",
    "get_llm_provider",
    "get_storage_provider",
]
