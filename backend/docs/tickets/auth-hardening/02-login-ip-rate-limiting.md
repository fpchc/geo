# 02 — Login IP rate limiting

**What to build:** 同一 IP 每分钟超过配置次数时，登录返回 429、错误码 `LOGIN_RATE_LIMITED`、并携带 `Retry-After`；未超限时正常登录。登录守卫作为独立深模块，隐藏固定窗口计数与 Redis 交互。

**Blocked by:** 01 — Integration test harness.

**Status:** ready-for-agent

- [x] 登录守卫模块提供 `check` 接口，内部实现固定窗口 IP 计数
- [x] 新增限流阈值配置项，并创建 `.env.example`
- [x] 异常基类与全局异常中间件支持响应 headers
- [x] API 集成测试覆盖：未超限登录成功；超限返回 429、错误码 20005、带 `Retry-After`
- [x] 登录成功路径与现有响应契约保持兼容

## Comments

- 已实现：`LoginGuard`（Redis Lua 原子计数）、`LoginRateLimitedException`、`AppException.headers`、`ExceptionMiddleware` 响应头、`AuthService.login` 限流检查、路由 IP 提取、`.env.example`。
- 本地验证：ruff / mypy 通过；pytest `18 passed, 2 skipped`（两个集成测试需要 MySQL/Redis）。
- 待验证：启动 MySQL/Redis 后重跑 `uv run pytest tests/test_auth_rate_limit.py -q`。
