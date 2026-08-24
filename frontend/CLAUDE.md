# 项目架构与约束

> 全局硬性约束，常驻加载。细分规范见 `.claude/commands/*.md`（按需加载）。

## 1. Monorepo 分层结构

pnpm workspace + turborepo，依赖方向：**上层依赖下层，不可反向**。

| 层 | 目录 | 职责 | 包名前缀 | 发布 |
| --- | --- | --- | --- | --- |
| 0 | `internal/*` | 构建工具链 | `@frontend/*` | ❌ |
| 1 | `packages/@core/base/*` | 基础设施（design/icons/shared/typings） | `@frontend-core/*` | ✅ |
| 2 | `packages/@core/{composables,preferences}` | 通用 composable + 偏好设置 | `@frontend-core/*` | ✅ |
| 3 | `packages/@core/ui-kit/*` | 纯 UI 组件（form/layout/menu/tabs/popup/shadcn） | `@frontend-core/*` | ✅ |
| 4 | `packages/{constants,types,utils,locales,...}` | 重导出层 | `@frontend/*` | ✅ |
| 5 | `packages/effects/*` | 业务效果层（access/common-ui/hooks/layouts/plugins/request） | `@frontend/*` | ✅ |
| 6 | `apps/web-*` | 应用层 | 无（app 不发包） | ❌ |

- `@frontend-core/*`：核心依赖，被 `@frontend/*` 重导出。
- `@frontend/*`：业务层统一入口，app 只引用此前缀（除 adapter 需直接用 core）。
- 跨层引用方向：`apps` → `packages` → `packages/@core` → `internal`，**禁止反向**。

## 2. 文件分工

| 文件 | 职责 | 时机 |
| --- | --- | --- |
| `CLAUDE.md` | 全局硬性约束（本文件），常驻 | 每次 |
| `.claude/commands/*.md` | 细分规范（架构/路由/API/状态/表格/表单/权限等） | 按需 |
| `.claude/feature/*.md` | 未来需求定义（需求 → 设计 → 实现） | 新功能 |
| `.ai/memory.md` | 上下文记忆（进度/决策/踩坑），极简 Key-Value | 进度记录 |

## 3. 全局硬性约束

### 技术栈（锁定版本范围）

- **Node**：`^22.18.0 || ^24.12.0`
- **pnpm**：`>=11.0.0`（`preinstall` 钩子强制，禁用 npm/yarn）
- **Vue**：3.5 + Composition API + `<script setup lang="ts">`
- **构建**：Vite 8（apps）+ tsdown（packages/@core + effects）
- **状态**：Pinia 4，**Setup 风格**（`defineStore('id', () => {...})`）
- **UI 框架**：Element Plus 2.14，全局注册，模板用 kebab-case（`<el-button>`）
- **列表/表单/弹窗**：默认走 Vben 封装（`useVbenVxeGrid` / `useVbenForm` / `useVbenModal`，从 `#/adapter/*` 引），树形/非分页等特例才用原生 Element Plus。见 `05/06/10`。
- **样式**：Tailwind 4（禁止写死 hex，统一走 design token）
- **类型**：TypeScript 6，严格模式

### 硬性规则

1. **路由**：三级以上自动拍平为二级（KeepAlive 限制），`name` 必须与组件 `defineOptions({ name })` 一致。
2. **数据源**：直连真实后端（Vite `/api` 代理），Nitro Mock 已关闭（`VITE_NITRO_MOCK=false`）。如需 mock 见 `03-api-request.md`。
3. **import 顺序**：`import type` 置顶，运行时按 `vue` → `@frontend/*` → 第三方 → `#/*` 分组（oxlint 校验）。
4. **禁止跨 app 引用**：app 内用 `#/` 别名，跨包用 `@frontend/*`，**禁止** `../../其他app`。
5. **包管理器**：仅限 pnpm，`npm install` / `yarn` 会被 `preinstall` 钩子拦截。
6. **UI 统一层**：所有页面必须使用统一 UI（`@frontend/common-ui` / `#/adapter/*`），**禁止直接 import Element Plus 组件**。表格→`useVbenVxeGrid`（`#/adapter/vxe-table`），表单→`useVbenForm`（`#/adapter/form`），弹窗/抽屉→`useVbenModal`/`useVbenDrawer`（`@frontend/common-ui`）。按钮→`VbenButton`，标签→`Badge`，确认弹窗→`confirm()`。仅 `ElMessage`（toast 服务）、`ElTree`（API 差异待迁移）、`ElTable`+`ElTableColumn`（树形表格/非分页小数据）、`ElUpload`（定制上传交互）可作为特例保留并注释。详见 `05/06/07/10`。

## 4. 核心访问限制

**绝对禁止** AI 读取/引用/分析/修改：

- **构建产物**：`dist/` `build/` `.output/` `.vite/` `.cache/` `.turbo/` `.nitro/`
- **依赖与日志**：`node_modules/` `pnpm-lock.yaml` `*.log`
- **私密配置**：`.env.local` `.vscode/` IDE 配置
- **Git 内部**：`.git/`（读 `.gitignore` 匹配项均禁止）

违反会污染上下文或触发安全风险。

## 5. 细分规范索引（`.claude/commands/`）

按需加载，AI 在执行对应任务时自动读取：

| 编号 | 文件                   | 触发场景                    |
| ---- | ---------------------- | --------------------------- |
| 01   | `architecture.md`      | 新建文件、组织代码          |
| 02   | `router-meta.md`       | 新增/修改路由               |
| 03   | `api-request.md`       | 写接口、调用后端、写 mock   |
| 04   | `state-pinia.md`       | 新增/使用 store             |
| 05   | `comp-table.md`        | 写列表页                    |
| 06   | `comp-form.md`         | 写表单、表单联动            |
| 07   | `ui-layout.md`         | 搭页面、写样式、用图标      |
| 08   | `ts-types.md`          | 定义类型                    |
| 09   | `monorepo-deps.md`     | 跨包引用、新增包、构建报错  |
| 10   | `comp-modal-drawer.md` | 写弹窗/抽屉表单             |
| 11   | `access-control.md`    | 加权限、控制菜单/按钮可见性 |

---

**注意**：CLAUDE.md 保持精简，具体骨架/示例/API 细节在 commands 里。AI 优先以真实代码为准，文档与代码冲突时以代码为准并更新文档。
