# 项目记忆更新规范 (update-memory)

> 使用场景：每次新增或修改功能完成后运行，保持 `.ai/` 与代码同步。

---

## 执行步骤

1. 读取 `.ai/ARCHITECTURE.md` 和 `.ai/MODULE_MAP.md`（不存在则新建）
2. 根据本次变更更新对应条目
3. 写回文件，单文件不超过 150 行

---

## `.ai/ARCHITECTURE.md` 格式

```markdown
# 架构快照

> 最后更新：{YYYY-MM-DD}

## 已完成模块

| 模块路径 | 职责 |
| --- | --- |
| app/main.py | FastAPI 入口 + lifespan |
| app/core/config.py | pydantic-settings 全局配置 |
| app/core/security.py | JWT 解析 + require_permission 依赖 |
| app/core/exceptions.py | 自定义异常基类 + 错误码枚举 |
| app/core/permission_scanner.py | 启动时扫描路由权限码并 upsert |
| app/middlewares/idempotency.py | X-Idempotency-Key 幂等中间件 |
| app/db/session.py | AsyncSession 工厂 + engine |
| app/models/rbac.py | User / Role / Permission / Menu |
| ... | ... |

## 关键设计决策

- 幂等 Redis key：`idem:{method}:{path}:{key}`，TTL 86400s
- 分页：page/page_size + 可选 sort_by/sort_order；响应体含 items/total/page/page_size/total_pages
- 权限码：`{module}:{resource}:{action}` 三段式字面量
- 中间件执行顺序：RequestMiddleware → IdempotencyMiddleware → ExceptionMiddleware → Handler
- ...（每次决策追加，不删除历史）

## 待实现

- [ ] {模块名}：{一句话说明}
```

---

## `.ai/MODULE_MAP.md` 格式

```markdown
# 模块路径映射

> 最后更新：{YYYY-MM-DD}

| 职责 | 文件路径 |
| --- | --- |
| FastAPI 入口 | app/main.py |
| 全局配置 | app/core/config.py |
| JWT 鉴权 + 权限依赖 | app/core/security.py |
| 异常定义 + 错误码 | app/core/exceptions.py |
| 权限码启动扫描 | app/core/permission_scanner.py |
| 幂等中间件 | app/middlewares/idempotency.py |
| 异步 DB Session | app/db/session.py |
| RBAC 模型 | app/models/rbac.py |
| 分页 Schema | app/schemas/pagination.py |
| 统一响应 Schema | app/schemas/response.py |
| ... | ... |
```

---

## 写入约束

* 只记**非显而易见的决策与状态**，不粘贴源码
* 已完成模块有变更时更新对应行；新增模块追加新行
* 设计决策只追加，不删除历史记录
* 待实现列表：已完成的打 `[x]`，新发现的补充 `[ ]`
* 单文件超过 150 行时，合并同类模块描述，删除过时条目
* `.ai/` 目录纳入版本控制，不加入 `.gitignore`
