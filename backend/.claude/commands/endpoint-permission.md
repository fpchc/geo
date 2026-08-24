# 接口权限码规则 (RBAC Permission Code)

> 使用场景：**新增接口**，或**修改接口的 method / path / decorator / 权限声明**时必须遵守。
> 仅修改函数体逻辑、Schema 字段、Service 内部实现，无需重跑本规则。
> 前置依赖：`app/core/security` 中的 `require_permission` 依赖与 `app/core/security/permission_scanner.py` 启动审计器已由骨架提供。
>
> **权限唯一来源**：本项目**无独立 Permission 表**。权限码的落库来源是**菜单按钮节点**（`menus.type=BUTTON`）的 `perm_code`，由 `scripts/menu_seed.py` 单一数据源维护（见 `/menu-seed`）。用户经「角色 → 授权菜单 → 按钮 perm_code」聚合权限码。接口中 `require_permission("code")` 声明的码，**必须**在菜单种子里有一个按钮节点承载同名 `perm_code`，否则任何角色都无法被授予该权限。

---

## 1. 权限码命名规则

统一采用三段式，小写字母 + 数字，段与段之间用英文冒号 `:` 分隔：

```
{module}:{resource}:{action}
```

| 段 | 含义 | 示例 |
| --- | --- | --- |
| `module` | 业务模块 / 子域，与顶层路由分组一致 | `system` / `order` / `finance` / `iam` |
| `resource` | 该模块下的具体资源（名词单数） | `user` / `role` / `refund` / `invoice` |
| `action` | 对资源的操作（动词原型） | `create` / `read` / `update` / `delete` / `list` / `export` / `approve` / `reject` |

### 命名细则

* 只允许 `[a-z0-9_]`，多单词使用下划线：`system:api_key:rotate`。
* `action` 严格使用下表约定动词，禁止自造词：
  * 读类：`read`（单条详情）、`list`（列表 / 分页 / 搜索）、`export`
  * 写类：`create`、`update`、`delete`、`patch`（部分更新，无必要不用）
  * 业务动作：`approve`、`reject`、`cancel`、`publish`、`archive`、`rotate`、`reset`、`assign`
  * 内容生产域业务动作：`generate`（AI 生成内容）、`score`（GEO 评分）、`optimize`（AI 优化内容）、`apply`（确认应用/替换）、`check`（爬虫命中检索）
* 只读接口（`GET`）必须以 `read` 或 `list` 结尾；写接口不得使用 `read`/`list`。
* 涉及批量操作时在动词前加 `batch_`：`order:refund:batch_approve`。
* **一个接口只声明一个权限码**。若一个接口天然需要多个权限（例如"审批同时修改状态"），拆分为两个接口。

---

## 2. 接口声明方式

**所有** `/api/v1/*` 路由必须通过 `Depends(require_permission("..."))` 声明权限码，健康检查（`/api/v1/health*`）与登录/刷新 token 接口除外。

```python
from fastapi import APIRouter, Depends

from app.core.security import require_permission
from app.schemas.pagination import PaginationParams, PaginatedResponse
from app.schemas.response import BizResponse

router = APIRouter(prefix="/users", tags=["system:user"])


@router.get(
    "",
    summary="用户列表",
    dependencies=[Depends(require_permission("system:user:list"))],
)
async def list_users(page: PaginationParams = Depends()) -> BizResponse[PaginatedResponse[UserOut]]:
    ...


@router.post(
    "",
    summary="创建用户",
    dependencies=[Depends(require_permission("system:user:create"))],
)
async def create_user(body: UserCreateIn) -> BizResponse[UserOut]:
    ...
```

### 强制约定

1. 权限码字符串**必须硬编码字面量**传入 `require_permission(...)`，不允许使用变量、拼接、常量引用。原因：启动扫描器通过 AST 静态提取，动态表达式无法采集。
2. 权限码必须写在 `dependencies=[...]` 中，不要放到函数签名参数里（避免污染 OpenAPI 参数）。
3. 每个权限码在 `summary` 中用中文描述其人类可读名；该中文名同时用作菜单种子里对应按钮节点的 `name`。
4. 路由的 `tags` 取 `{module}:{resource}`，用于 Swagger 分组与菜单归属。

---

## 3. 权限落库：以菜单按钮为唯一来源（不写 Permission 表）

本项目**无 Permission 表**。接口声明的 `require_permission("code")` 只是运行时鉴权判据；权限码要能被授权，必须在菜单种子中有一个**按钮节点**承载同名 `perm_code`。

新增接口后的落库动作在 `/menu-seed`：

1. 在 `scripts/menu_seed.py::MENU_TREE` 对应菜单下新增 `SeedMenu(type=BUTTON, perm_code="<同一 code>")`，`name` 用接口 `summary` 的中文名。
2. 重新生成 `doc/sql/menu.sql`（`python -m scripts.gen_menu_sql`），由用户导入目标库。
3. 角色经 `PUT /roles/{id}/menus` 授权该按钮所在菜单，用户即获得权限码。

### 启动一致性审计（由骨架实现，只读不写库）

应用启动 lifespan 阶段调用 `audit_permission_codes(session)`：

* 收集代码中 `require_permission(...)` 声明的全部字面量码（AST 静态提取，见 `declared_permission_codes`）。
* 收集菜单按钮节点已配置的 `perm_code`。
* 比对差异并写 JSON 日志：**代码已声明但菜单未覆盖**（该接口暂无角色可授权，需补 menu_seed）、**菜单有但代码无对应接口**（僵尸权限码，建议清理）。
* 审计器**不写任何表**，只提示开发者保持两侧一致。

---

## 4. AI 生成新接口时的自检清单

写完接口后逐项确认：

- [ ] 权限码符合 `{module}:{resource}:{action}` 三段式且全部小写。
- [ ] `action` 来自允许清单，且与 HTTP 方法语义一致。
- [ ] 权限码是字面量字符串，未使用变量或拼接。
- [ ] 声明在 `dependencies=[...]`，而非函数签名参数。
- [ ] `summary` 有中文描述；`tags` 为 `{module}:{resource}`。
- [ ] 已在 `scripts/menu_seed.py` 为该 code 补一个 `BUTTON` 节点承载同名 `perm_code`（无 Permission 表，权限落库靠菜单按钮）。
- [ ] 未手写任何 Permission 表 INSERT（该表已不存在）；未手写 `doc/sql/menu.sql`，靠 `gen_menu_sql` 生成。
- [ ] 一个接口只有一个 `require_permission`；有多个权限诉求则拆分接口。
