# 项目上下文记忆 (Project Context Memory)

> 极简 Key-Value / Bullets 格式。记录进度、决策和关键上下文。Token 优先。

---

## 当前状态 (Current State)

- **项目：** frontend-monorepo v5.7.0
- **上游仓库：** vbenjs/vue-vben-admin (Vben 5.x fork)
- **当前活跃 app：** `apps/web-admin`（管理后台，端口 5777）
- **包管理器：** pnpm@11.16.0
- **Node：** `^22.18.0 || ^24.12.0`

## 待办 (Pending)

- [ ] 后端菜单模式待接入（当前 accessMode=frontend，菜单由 modules/*.ts 定义）
- [ ] .env.production 的 VITE_GLOB_API_URL 填真实生产域名（当前为占位符）
- [ ] 现有 user/role/menu 页面可择机迁移到 useVbenVxeGrid（非阻塞，旧例保留）

## 已定方案 (Resolved 2026-07-27)

- **Pinia**：统一 Setup 风格（跟随 auth.ts，CLAUDE.md 已改）。
- **表格/表单/弹窗**：默认 Vben 封装（useVbenVxeGrid / useVbenForm / useVbenModal，从 #/adapter/* 引）；树形/非分页/嵌非标准控件等特例才用原生 Element Plus。
- **Mock**：关闭（VITE_NITRO_MOCK=false），直连真实后端；生产 API 地址已从上游演示地址改为占位符待填。

## 决策记录 (Decisions)

### 2026-07-27：生成 `.claude/commands/` 约束文档体系

- 扫描真实代码，提炼 11 篇细分约束文档（01-architecture ~ 11-access-control）
- **发现矛盾**：
  1. **Pinia 风格**：CLAUDE.md 与 memory.md 声称"Options API"，但 `store/auth.ts` 真实用 **Setup 风格**(`defineStore('id', () => {...})`)。约束文档以真实代码为准，统一 Setup 风格。
  2. **表格方案**：CLAUDE.md 曾提"严禁原生 Table"，但所有真实页面（user/role/menu）用 **原生 ElTable**，`useVbenVxeGrid` 封装存在但无页面使用。约束文档记录两种骨架，基线跟随现有（ElTable）。
- **文档分工明确化**：CLAUDE.md 精简为全局硬约束 + 细分索引；commands/*.md 按领域细分（架构/路由/API/状态/表格/表单/布局/类型/monorepo/弹窗/权限）。
- 优化 CLAUDE.md：修正 Pinia 风格描述、补充包名前缀规律、增加 commands 索引表、修复 markdown lint。

### 2026-07-25（历史）

- 全局重命名 @vben → @frontend, @vben-core → @frontend-core
- web-ele → web-admin，规划三平台架构
- 建立 CLAUDE.md + commands + feature 三层 AI 规范体系
- web-admin 补齐 RBAC（user/role/menu CRUD）
- System 路由从 core.ts 迁至 modules/system.ts（安全：core 会绕过登录鉴权）

### 架构约定（恒定）

- 三级以上路由自动拍平为二级（keep-alive 限制）
- Mock 服务在所有环境启用（含生产）
- Element Plus 组件全局注册，模板中直接使用 kebab-case
- 包管理器仅限 pnpm（preinstall 强制）
- 公共组件统一使用 withInstall 包装

## 技术栈 (Tech Stack)

- Vue 3.5.40 + Vite 8.1.5 + TypeScript 6.0.3
- Pinia 4.0.2 + Vue Router 5.2.0
- Tailwind 4.3.3 + Element Plus 2.14.3
- tsdown 构建（@frontend-core/* 包）/ vite 构建（apps）

## 最近修改 (Recent Changes)

- 2026-07-25: web-admin 按 swagger system:* 补齐 RBAC（用户/角色/菜单）：api/core + views/_core/system + 路由模块 modules/system.ts
- 2026-07-25: 将 System 路由从 core.ts 迁至 modules/system.ts（core.ts 会绕过登录鉴权守卫，属安全隐患）
- 2026-07-25: 全局替换 @vben → @frontend, VBEN_ → FRONTEND_
- 2026-07-25: 创建三平台 apps/web-admin + web-demand + web-supply
- 2026-07-25: 创建 .claude/commands/ 体系 + .claude/feature/ 需求模板
- 2026-07-25: 精简 CLAUDE.md 为全局硬性约束
