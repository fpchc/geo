# 04 — Session revocation for logout & refresh

**What to build:** 每个用户维护会话索引；会话元数据记录关联的 refresh jti；登出同时撤销 access 与 refresh；刷新轮换后旧 refresh 失效、新令牌可用，索引同步更新。

**Blocked by:** 01 — Integration test harness.

**Status:** ready-for-agent

- [x] 会话存储支持按用户索引 access 会话
- [x] 登出撤销 access + refresh
- [x] 刷新轮换维护索引，旧 refresh 失效、新 refresh 可用
- [x] API 集成测试覆盖登出与刷新轮换
- [x] 现有登录 / 刷新 / 登出成功路径保持兼容

## Comments

- 已实现：Redis Hash `user_sessions:{user_id}` 记录 access_jti → refresh_jti；`create_session` / `revoke_session` / `revoke_all_sessions` 维护索引；登出与刷新轮换删除 access + refresh。
- 本地验证：ruff / mypy 通过；pytest `22 passed, 10 skipped`（集成测试需要 MySQL/Redis）。
- 待验证：启动服务后重跑 `uv run pytest tests/test_auth_session_revocation.py -q`。
