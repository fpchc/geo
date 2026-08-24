"""全局配置：pydantic-settings 统一管理多环境变量。

扩展启用开关命名遵循 `{module_name}_enabled`，供 loader 反射读取。
"""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

type ProviderBackend = Literal["http", "mock"]
type LLMBackend = Literal["qwen", "mock"]
type CrawlerBackend = Literal["http", "mock"]


class Environment(StrEnum):
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Application ----
    app_name: str = "Enterprise Backend"
    app_version: str = "0.1.0"
    app_description: str = "企业级 FastAPI 后端服务"
    environment: Environment = Environment.DEV
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # ---- OpenAPI / Swagger 文档 ----
    docs_enabled: bool = True  # 生产环境应置为 false
    docs_url: str = "/docs"
    redoc_url: str = "/redoc"
    openapi_url: str = "/openapi.json"
    openapi_contact_name: str = "Platform Team"
    openapi_contact_email: str = "dev@example.com"
    openapi_license_name: str = "MIT"

    # ---- Security / JWT ----
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7
    # redis 会话白名单 key 前缀
    session_key_prefix: str = "session"
    refresh_key_prefix: str = "refresh"
    # 权限码缓存（按角色）：key 前缀 + TTL 兜底（秒）；超级用户全量按钮码单独缓存
    perm_cache_role_prefix: str = "perm:role"
    perm_cache_super_key: str = "perm:super"
    perm_cache_ttl_seconds: int = 3600

    # ---- Database ----
    database_url: str = "mysql+aiomysql://app:app@localhost:3306/app"
    db_echo: bool = False
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 1800

    # ---- Redis ----
    redis_url: str = "redis://localhost:6379/0"

    # ---- Extension enable switches ({module_name}_enabled) ----
    logging_ext_enabled: bool = True
    redis_ext_enabled: bool = True
    db_ext_enabled: bool = True
    route_ext_enabled: bool = True
    minio_ext_enabled: bool = True

    # ---- Logging ----
    log_level: str = "INFO"
    log_dir: str = "logs"
    log_file: str = "app.log"
    log_max_bytes: int = 10 * 1024 * 1024
    log_backup_count: int = 5

    # ---- Idempotency ----
    idempotency_ttl_seconds: int = 86400

    # ---- Observability ----
    otel_enabled: bool = False
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    prometheus_enabled: bool = False

    # ---- Provider ----
    provider_backend: ProviderBackend = "http"
    provider_base_url: str = "https://api.example.com"
    provider_timeout_seconds: float = 10.0

    # ---- MinIO / 对象存储 ----
    # 客户端连接由 extensions/minio_ext.py 管理；业务调用统一走 StorageProvider。
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "change-me"
    minio_secret_key: str = "change-me"
    minio_bucket: str = "geo-content"
    minio_secure: bool = False
    # 预签名 URL 默认有效期（秒）
    minio_presign_expire_seconds: int = 3600

    # ---- LLM (Qwen) ----
    llm_backend: LLMBackend = "qwen"
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_api_key: str = "change-me"
    qwen_model: str = "qwen-plus"
    qwen_timeout_seconds: float = 60.0
    # 评分固定低温度，保证同一篇文章分数可复现（见 M3 / Q7）
    qwen_score_temperature: float = 0.1
    qwen_generate_temperature: float = 0.7

    # ---- 内容生产（Content Production, POC）----
    # 单篇内容「重新生成」次数上限（F-13）；达上限锁定，仅可确认留存。
    content_regen_limit: int = 10
    # 资料上传格式白名单（F-07 / Q-01）：txt/md 直读，pdf/docx 解析后注入。
    material_allowed_extensions: str = "txt,md,pdf,docx"
    # 资料解析后正文字符数上限（F-07 / Q-02）：依模型上下文窗口约束，超限拦截。
    material_max_chars: int = 100_000
    # 资料原始文件字节上限（防御性硬上限，先于解析拦截）。
    material_max_bytes: int = 20 * 1024 * 1024

    # ---- Crawler / 命中验证 ----
    crawler_backend: CrawlerBackend = "mock"
    crawler_base_url: str = "https://api.example.com"
    crawler_timeout_seconds: float = 30.0
    # 反爬限速：每秒最大请求数
    crawler_rate_limit_per_second: float = 1.0

    @property
    def is_prod(self) -> bool:
        return self.environment is Environment.PROD

    @property
    def log_file_path(self) -> str:
        return f"{self.log_dir.rstrip('/')}/{self.log_file}"

    @property
    def docs_visible(self) -> bool:
        """文档是否对外暴露：显式开关 + 生产环境强制关闭。"""
        return self.docs_enabled and not self.is_prod


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """单例配置访问器（缓存），测试可通过 clear() 重置。"""
    return Settings()


settings: Settings = get_settings()
