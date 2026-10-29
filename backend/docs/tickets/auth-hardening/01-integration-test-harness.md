# 01 — Integration test harness

**What to build:** 测试能以完整应用生命周期启动，连接真实 Redis 测试库与测试数据库；支持按测试覆盖认证阈值，并在每个测试开始前清理状态。用一个「创建用户 → HTTP 登录成功 → 返回令牌对」的冒烟测试证明脚手架可用。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 测试应用以完整 lifespan 启动，连接真实 Redis 测试库与测试数据库
- [ ] 每个测试开始前清理 Redis 与数据库状态
- [ ] 认证阈值可被测试覆盖，且不污染其他测试
- [ ] 冒烟测试通过：创建用户 → HTTP 登录成功 → 返回令牌对
- [ ] 现有测试保持通过（预存 `test_providers.py` 失败除外）

## Comments

- 已实现：`tests/conftest.py` 新增 `integration_app` / `integration_client` / `db_session`；`tests/test_auth_smoke.py` 冒烟测试。
- 本机 Docker daemon 未运行、MySQL/Redis 不可达，冒烟测试当前为 `skipped`；启动服务后需重跑 `uv run pytest tests/test_auth_smoke.py -q` 验证。
