# 05 — Disable/delete user revokes all sessions

**What to build:** 用户 `is_active` 由真变假时撤销其全部会话；删除用户同样撤销；重新启用不会恢复旧会话；无关字段更新不触发撤销。

**Blocked by:** 04 — Session revocation for logout & refresh.

**Status:** ready-for-agent

- [x] 会话存储支持 `revoke_all_sessions(user_id)`
- [x] 用户更新检测 active→inactive 转换并撤销会话
- [x] 删除用户撤销全部会话
- [x] API 集成测试覆盖：禁用后 access/refresh 失效；重新启用不恢复；删除后失效；无关更新不撤销
- [x] 不引入数据库表结构迁移

## Comments

- 已实现：`UserService.update` 检测 active→inactive 后调用 `revoke_all_sessions`；`UserService.delete` 删除前撤销全部会话。
- 本地验证：ruff / mypy 通过；pytest `22 passed, 10 skipped`（集成测试需要 MySQL/Redis）。
- 待验证：启动服务后重跑 `uv run pytest tests/test_auth_user_disable.py -q`。
