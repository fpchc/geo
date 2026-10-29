# 认证补强：登录限流与失败锁定

Status: ready-for-agent

## Problem Statement

管理后台的登录端点目前只校验用户名与密码，没有请求限流，也没有连续失败锁定。攻击者可以不受限制地尝试密码，系统无法从应用层阻断暴力破解。

另有两个会话语义缺口：禁用用户不会主动撤销已有会话，重新启用后旧令牌可能在有效期内复活；登出只删除访问令牌，刷新令牌仍然可用。

## Solution

在登录端点加入两层防护：

1. **按 IP 的请求限流**：同一 IP 每分钟最多 10 次登录尝试；
2. **按用户名的失败锁定**：15 分钟内连续 5 次失败后锁定 15 分钟。

登录成功清零该用户名的失败计数；限流或锁定触发时返回统一的 429 与 `Retry-After`，不泄露用户名是否存在。禁用或删除用户时撤销其全部会话；登出时同时撤销访问令牌与刷新令牌。所有阈值通过配置驱动，不硬编码。

## User Stories

1. As a 安全管理员, I want 同一 IP 每分钟最多尝试 10 次登录, so that 短时暴力破解被阻断。
2. As a 安全管理员, I want 同一用户名在 15 分钟内连续失败 5 次后被锁定 15 分钟, so that 持续猜测密码被阻断。
3. As a 安全管理员, I want 登录成功后清空该用户名的失败计数, so that 正常用户不会因为偶发输错累积到锁定。
4. As a 安全管理员, I want 锁定期间即使输入正确密码也继续拒绝, so that 锁定不可被猜中密码绕过。
5. As a 普通用户, I want 限流或锁定时看到统一的「尝试次数过多，请稍后再试」, so that 我无法判断用户名是否存在。
6. As a 普通用户, I want 429 响应携带 `Retry-After` 头, so that 客户端知道何时可以重试。
7. As a 安全管理员, I want 限流与锁定使用不同错误码, so that 日志与告警能区分两类事件。
8. As a 安全管理员, I want 限流与锁定状态存放在 Redis, so that 多实例部署共享同一策略。
9. As a 安全管理员, I want 锁定到期后自动恢复登录, so that 不需要人工解锁。
10. As a 安全管理员, I want 一个用户名的锁定不影响其他用户名, so that 故障与攻击不会扩散。
11. As a 安全管理员, I want 禁用用户时立即撤销其全部会话, so that 被禁用的人不能继续使用旧令牌。
12. As a 安全管理员, I want 重新启用用户后旧会话不恢复, so that 禁用是明确的终止信号。
13. As a 安全管理员, I want 删除用户时也撤销其全部会话, so that 已删除账号的令牌不残留。
14. As a 安全管理员, I want 登出时同时撤销访问令牌与刷新令牌, so that 登出后不能用刷新令牌换回新会话。
15. As a 运维人员, I want 限流阈值、失败阈值、失败窗口与锁定时长都能通过环境变量配置, so that 不同环境可以调整策略。
16. As a 运维人员, I want 新手配置项出现在 `.env.example`, so that 部署时不会遗漏。
17. As a 运维人员, I want 限流/锁定触发时写入 WARN 日志, so that 可以审计与告警。
18. As a 运维人员, I want 日志包含 username、IP 与剩余秒数, so that 能定位来源；同时禁止记录密码与令牌。
19. As a 开发者, I want 登录策略是独立深模块, so that 阈值逻辑可单测, `AuthService` 只负责编排。
20. As a 开发者, I want 登录不要求 `X-Idempotency-Key`, so that 登录重试仍然创建新会话, 符合认证语义。
21. As a 开发者, I want 现有登录、刷新、登出成功路径保持不变, so that 补强不破坏现有客户端。
22. As a 测试工程师, I want 通过 HTTP API 测试限流、锁定与撤销会话, so that 测试覆盖真实依赖链。
23. As a 测试工程师, I want 阈值逻辑有独立单测, so that 窗口边界、剩余秒数与清零规则可快速验证。
24. As a 安全管理员, I want 不存在的用户名也计入失败次数, so that 攻击者无法通过锁定行为枚举账号。
25. As a 运维人员, I want Redis 不可用时登录按服务不可用处理, so that 不因缓存故障降级放行。
26. As a 安全管理员, I want IP 限流统计所有登录尝试（含成功）, so that 高频探测无法借成功登录绕过。
27. As a 安全管理员, I want 失败锁定只统计失败, so that 正常成功登录不会触发锁定。
28. As a 开发者, I want IP 来源默认取直连客户端地址, so that 不默认信任可伪造的转发头。

## Implementation Decisions

### 模块与接口

- 新增**登录守卫模块**，对外提供小接口：
  - `check(client_ip, username) -> LoginDecision`：返回允许、限流或锁定，并携带剩余秒数；
  - `record_failure(client_ip, username)`：记录一次失败；
  - `reset(username)`：登录成功后清零失败计数。
- 阈值判断抽成纯函数，便于单测；深模块内部隐藏 Redis 计数、窗口与锁定判断。
- `AuthService.login` 增加 `client_ip` 参数，按顺序编排：
  1. 守卫 `check`（IP 限流 + 用户名锁定）；
  2. 校验用户与密码；
  3. 失败 → `record_failure` 并返回 401；
  4. 成功 → `reset` 并签发会话。
- 登录路由从请求中提取直连客户端 IP；取不到时使用 `unknown`。默认不信任 `X-Forwarded-For`，可信代理配置留到后续。
- 会话存储模块新增 `revoke_all_sessions(user_id)`；维护每用户会话索引，支持禁用/删除用户时撤销全部访问令牌与刷新令牌。
- 会话元数据记录关联的 refresh jti；登出时同时撤销 access 与 refresh。刷新轮换沿用现有废弃旧对的语义，并同步维护用户会话索引。
- 用户服务在 `is_active` 由真变假时调用 `revoke_all_sessions`；删除用户时同样调用。无关字段更新不触发撤销。
- 会话索引在 Redis 中维护，不引入数据库表迁移。

### API 契约

- `POST /api/v1/auth/login` 的请求与成功响应保持不变。
- 限流与锁定统一返回 HTTP 429：
  - 限流：`code=20005`（`LOGIN_RATE_LIMITED`）；
  - 锁定：`code=20006`（`LOGIN_LOCKED`）；
  - `message` 统一为「尝试次数过多，请稍后再试」；
  - `data` 为 `null`；
  - 响应头包含 `Retry-After: <剩余秒数>`。
- 凭据错误仍返回 HTTP 401，消息保持「用户名或密码错误」。
- 不存在的用户名与密码错误返回同一响应，避免账号枚举。

### 阈值与配置

- 配置项：
  - `auth_login_rate_limit_per_minute`，默认 10；
  - `auth_login_failure_threshold`，默认 5；
  - `auth_login_failure_window_minutes`，默认 15；
  - `auth_login_lockout_minutes`，默认 15。
- IP 限流采用固定窗口：计数在窗口内累计，窗口过期归零。固定窗口边界可能产生双倍突发，接受该取舍；未来可替换为滑动窗口。
- 失败计数采用从首次失败开始计时的窗口；达到阈值时写入锁定标记，TTL 为锁定时长。
- 登录成功删除该用户名的失败计数与锁定标记；IP 限流窗口不因成功登录提前重置。
- 不存在的用户名同样参与失败计数与锁定，防止枚举。
- Redis key 使用独立前缀并通过配置驱动，沿用现有前缀配置模式。

### 错误码与异常

- 在集中错误码枚举中新增 `LOGIN_RATE_LIMITED = 20005`、`LOGIN_LOCKED = 20006`。
- 业务异常基类支持可选的响应 headers；全局异常处理中间件把 `Retry-After` 写入 429 响应。
- Redis 不可用时，守卫将连接错误转换为服务不可用异常（503），与现有会话白名单的失败语义一致，不放行。

### 日志

- 限流与锁定触发时写 WARN：
  - 事件名区分 `auth.login.rate_limited` 与 `auth.login.locked`；
  - 字段包含 username、client_ip、retry_after；
  - 禁止记录密码、访问令牌与刷新令牌。
- 凭据校验失败写 INFO，包含 username 与 client_ip，不包含密码。

### 配置样例

- 创建 `.env.example`，包含新增认证配置项；同时补齐数据库、Redis、JWT 等必需配置的占位值，禁止提交 `.env`。

## Testing Decisions

### 好测试的标准

- 只测试外部行为：HTTP 状态、响应体错误码、`Retry-After`、登录是否成功、旧令牌是否失效；不测试 Redis key 的具体形状或内部函数调用。
- 使用最高 seam：登录/刷新/登出的 HTTP API 集成测试为主；阈值纯函数单测为辅。
- 测试不得调用真实外部服务；Provider 继续用依赖覆盖替换。

### 测试 seam

- 主 seam：`/api/v1/auth/login`、`/api/v1/auth/refresh`、`/api/v1/auth/logout`。
- 辅 seam：登录守卫的纯阈值函数。

### 集成测试脚手架

- 现有测试脚手架只挂路由、跳过 Redis/DB；需要新增：
  - 真实 Redis 测试实例（独立 DB，测试前清理）；
  - 测试数据库（建表或迁移后执行，测试间回滚或清理）；
  - 应用 fixture 使用完整 lifespan，确保会话存储与守卫可用；
  - 测试配置使用更小阈值（例如 IP 每分钟 3 次、失败 2 次锁定 1 分钟），避免测试等待。
- 既有 `tests/conftest.py` 的 ASGITransport 用法作为 prior art；`tests/test_health.py` 与 `tests/test_security.py` 作为 API/单元测试风格参考。

### 必测场景

1. 未达 IP 阈值时登录成功；
2. 超过 IP 阈值返回 429、错误码 20005、带 `Retry-After`；
3. 连续失败达到阈值后返回 429、错误码 20006；
4. 锁定期间正确密码仍被拒绝；
5. 登录成功后失败计数清零，不会立即锁定；
6. 不存在的用户名与密码错误返回同一 401 响应；
7. 禁用用户后旧访问令牌失效，重新启用也不恢复；
8. 删除用户后旧访问令牌与刷新令牌失效；
9. 登出后旧访问令牌与刷新令牌都失效；
10. 刷新轮换后旧刷新令牌失效，新令牌可用；
11. 现有登录、刷新、登出成功路径保持兼容。

## Out of Scope

- MFA、密码复杂度/过期策略、CAPTCHA。
- `/auth/refresh` 的独立限流。
- 密码重置后撤销会话。
- 全局/跨实例的账号锁定通知与告警集成。
- OpenTelemetry / Prometheus 认证指标。
- IP 白名单与可信代理头解析。
- 内容域状态机修正、内容权限调整。
- 数据库表结构变更。
- 账号类型 / demand / supplier（ADR-0001 已取消）。

## Further Notes

- **账号锁定 DoS**：攻击者可以故意锁定已知用户名。当前接受该取舍，用 15 分钟短锁定 + WARN 日志缓解；后续可加 CAPTCHA 或通知。
- **固定窗口边界突发**：IP 限流采用固定窗口，窗口交界处可能允许双倍请求；后续可替换为滑动窗口。
- **索引兼容**：上线前已存在的会话不会被写入用户会话索引，但会在 access/refresh TTL 内自然过期；不做 Redis 数据迁移。
- **登出修复**：当前登出只删除访问令牌，刷新令牌仍可用；本 spec 将其视为安全修复，属于认证补强范围。
- **`.env.example` 缺失**：当前仓库没有该文件；本 spec 一并创建。
- **登录与幂等**：登录是公开端点，重试会创建新会话，明确不要求 `X-Idempotency-Key`。
- **测试全局配置**：配置是全局单例，测试需通过依赖覆盖或缓存清理切换阈值，避免不同测试相互污染。
- **预存测试债**：`test_providers.py` 的 Protocol isinstance 失败与本 spec 无关，不在本轮修复。
