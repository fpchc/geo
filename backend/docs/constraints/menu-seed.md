# 菜单模块开发规范 (Menu Seed & Tree)

> 使用场景：**新增或修改任何菜单节点**（种子菜单、菜单表结构、菜单树接口）时必须遵守。
> 触发信号：只要涉及"添加菜单 / 新增菜单节点 / 调整菜单树 / 修改菜单字段"即自动加载本规则，无需用户提醒。
> 单一数据源：`scripts/menu_seed.py` 是全部内置菜单的唯一定义处，禁止在别处手写菜单 SQL / INSERT。

---

## 1. 菜单表结构 (`app/models/rbac.py::Menu`)

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | BigInteger | PK, 显式指定 | 内置菜单 ID 必须手工分配（见 §4），保证生成稳定、可重复导入 |
| `name` | String(128) | 必填 | 菜单/按钮中文名 |
| `type` | Integer | index, 默认 `MENU` | `MenuType` 枚举：`0 DIRECTORY` / `1 MENU` / `2 BUTTON` |
| `parent_id` | BigInteger | NOT NULL, 默认 `0`, index | 父节点 ID；`0` = 虚拟根（无自引用外键） |
| `ancestors` | String(255) | NOT NULL, 默认 `""` | 逗号分隔祖先路径，**不含自身**，带虚拟根 `0`（见 §3） |
| `path` | String(255) | 默认 `""` | 前端路由路径，按钮节点可空 |
| `icon` | String(64) | 可空 | 图标标识 |
| `perm_code` | String(128) | 可空 | 关联权限码；**按钮节点必填**（三段式，见 `docs/constraints/endpoint-permission.md`）。**本字段是全项目权限码的唯一落库来源**——无独立 Permission 表，鉴权经「角色 → 授权菜单 → 按钮 perm_code」聚合。 |
| `order_no` | Integer | 默认 `0` | 同级排序，升序 |
| `visible` | Boolean | 默认 `True` | 是否在导航树显示 |

### `MenuType` 语义

* `DIRECTORY(0)`：目录，仅用于分组，通常无 `perm_code`。
* `MENU(1)`：菜单页，对应一个前端路由 `path`，`perm_code` 建议为 `{module}:{resource}:list`。
* `BUTTON(2)`：页面内操作按钮，**无 `path`**，**必须有 `perm_code`**（对应具体动作）。

---

## 2. 单一数据源与三条生成链路

内置菜单只在 `scripts/menu_seed.py` 的 `MENU_TREE` 中用**嵌套结构**声明。三条下游链路全部从它派生，禁止各自维护：

```
scripts/menu_seed.py  (MENU_TREE 嵌套树 + flatten())   ← 唯一数据源
        │
        ├─ scripts/gen_menu_sql.py   →  deploy/sql/menu.sql        （手动导入用的幂等 SQL）
        └─ app.core.hierarchy.build_forest                       （运行时建树，见 §6）
```

* `SeedMenu`：嵌套声明用（`children` 承载子节点），**不含** `parent_id` / `ancestors`。
* `FlatMenu`：`flatten()` 展平后的行，含 `parent_id` / `ancestors`，供 SQL 生成直接使用。
* `flatten()` 递归 `walk`：根节点 `parent_id=0`、`ancestors="0"`；子节点 `parent_id=父.id`、`ancestors = 父.ancestors + "," + 父.id`。

### 添加/修改菜单的标准流程（不可跳过）

1. **只改 `scripts/menu_seed.py::MENU_TREE`**：在正确父节点的 `children` 下新增 `SeedMenu(...)`，按 §4 分配 `id`。
2. 若新增按钮节点，确保其 `perm_code` 已有对应接口声明（见 `docs/constraints/endpoint-permission.md`），否则权限扫描器不会入库该权限。
3. 重新生成 SQL：`python -m scripts.gen_menu_sql`（产物 `deploy/sql/menu.sql`，行数应等于树节点总数）。
4. 当前不提供菜单 data migration；目标库通过 `deploy/sql/menu.sql` 幂等导入。
5. **禁止**手写 `deploy/sql/menu.sql`、手写 INSERT、或在 migration 里硬编码菜单行。

---

## 3. `ancestors` 路径枚举规则（防误匹配核心）

* 语义：**不含自身**的祖先 ID 逗号串，最左为虚拟根 `0`。
  * 根菜单：`parent_id=0`，`ancestors="0"`。
  * 二级：`ancestors="0,1"`（父为 id=1）。
  * 三级：`ancestors="0,1,5"`。
* 节点"完整路径" = `ancestors + "," + id`（如 id=5 在 `0,1` 下 → `0,1,5`）。
* **子树查询必须带尾分隔符**，避免 `0,1,5` 误命中 `0,1,50`：

  ```sql
  -- 查 N 及其所有子孙（N 的完整路径记为 self_path）
  WHERE id = N OR ancestors LIKE '<self_path>,%'
  ```

  对应实现 `app/repositories/menu_repo.py::list_subtree`。
* **运行时新增/移动节点由 `MenuService` 维护 `ancestors`，不要手动拼**：
  * `create`：`_child_ancestors(parent)` 推导（父为根 → `"0"`；否则 `父.ancestors + "," + 父.id`）。
  * `_move`：重算自身 `ancestors`，再批量替换全部子孙前缀（`旧 self_path → 新 self_path`）；并校验目标不是自身或自身子孙（防环）。

---

## 4. 内置菜单 ID 分配约定

内置菜单 ID 手工分配，遵循现有分段，避免与运行时自增 ID 冲突：

| 区间 | 用途 | 现状示例 |
| --- | --- | --- |
| `1–9` | 顶级目录（DIRECTORY） | `1 系统管理` |
| `10–99` | 二级菜单页（MENU） | `5 用户管理` / `6 角色管理` / `7 菜单管理` |
| `100+` | 按钮（BUTTON），按所属菜单分段 | 用户 `100–105`、角色 `110–114`、菜单 `120–123` |

* 新增按钮请在对应菜单的段内顺延，`order_no` 从 1 递增。
* 新增顶级/二级节点时沿用分段思路，ID 全局唯一且稳定。

---

## 5. 生成物幂等约定 (`deploy/sql/menu.sql`)

* 文件头声明"自动生成，请勿手动修改 / 数据源：scripts/menu_seed.py"。
* 结构：`SET NAMES utf8mb4;` → `DELETE FROM menus WHERE id IN (...)` → 单条多值 `INSERT`。
* 先删后插保证**可重复导入**；`visible` 恒为 `1`。
* 该 SQL 仅供**手动导入**；是否执行、导入到哪个库由用户决定，AI 不得代为连生产库执行（见项目安全约束）。

---

## 6. 菜单树构建（运行时，查库一次）

* 一律 `MenuRepository.list_ordered()` 查全量（按 `order_no, id` 排序）一次，再用 `app.core.hierarchy.build_forest` 在内存 O(n) 建树，**禁止递归查库 / N+1**。
* `nav_tree()`：导航树，`prune` 掉 `BUTTON` 节点。
* `full_tree()`：授权树，保留目录/菜单/按钮全量。
* 建树 selectors 固定：`id_of=id`、`parent_id_of=parent_id`、`root_parent_id=0`、`sort_key=(order_no, id)`。

---

## 7. 新增/修改菜单自检清单

- [ ] 仅改动 `scripts/menu_seed.py::MENU_TREE`，未在别处手写菜单 SQL / INSERT。
- [ ] `id` 按 §4 分段唯一分配；`order_no` 同级从 1 递增。
- [ ] `BUTTON` 节点有 `perm_code` 且无 `path`；`perm_code` 已有对应接口声明。
- [ ] 未手写 `ancestors`——由 `flatten()`（种子）或 `MenuService`（运行时）推导。
- [ ] 已跑 `python -m scripts.gen_menu_sql`，`deploy/sql/menu.sql` 行数 = 树节点总数。
- [ ] 子树相关查询均带尾分隔符（`LIKE '<path>,%'`），未直接用 `LIKE '<path>%'`。
- [ ] 未在 migration / 业务代码里硬编码菜单行；未代替用户对生产库执行导入。
