# 03 — Username failure lockout

**What to build:** 同一用户名在配置窗口内连续失败达到阈值后进入锁定；锁定期间即使密码正确也被拒绝；登录成功清零失败计数；不存在的用户名同样参与计数，避免账号枚举。

**Blocked by:** 02 — Login IP rate limiting.

**Status:** ready-for-agent

- [x] 登录守卫模块扩展 `record_failure` / `reset`，实现失败窗口与锁定
- [x] 新增失败阈值、失败窗口、锁定时长配置项，更新 `.env.example`
- [x] 新增错误码 `LOGIN_LOCKED`
- [x] API 集成测试覆盖：达到阈值返回 429 + 20006；正确密码仍被拒；成功清零；不存在用户名同样返回 401
- [x] 锁定到期后自动恢复（测试使用短 TTL 验证）

## Comments

- 已实现：`LoginGuardConfig` + `record_failure` / `reset` / `evaluate_lockout`；失败计数与锁定 key 用 Redis Lua 原子写入；`AuthService.login` 失败记录、成功清零。
- 本地验证：ruff / mypy 通过；pytest `22 passed, 4 skipped`（集成测试需要 MySQL/Redis）。
- 待验证：启动服务后重跑 `uv run pytest tests/test_auth_lockout.py -q`。
