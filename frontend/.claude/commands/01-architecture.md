---
description: 目录结构与命名规范 - 新建文件、放置文件、组织 <script setup> 时加载
---

# 01 · 目录与命名规范

> 依据真实代码 `apps/web-admin/src` 提炼。所有 app（web-admin / 未来 web-demand / web-supply）遵循同一套约定。

## 1. app 内目录职责

以 `apps/web-admin/src` 为准：

| 目录 | 职责 | 说明 |
| --- | --- | --- |
| `api/` | 网络请求层 | `api/core/*` 按业务模块分文件；`api/request.ts` 定义 requestClient；`api/index.ts` 统一 `export *` |
| `views/` | 页面组件 | `views/_core/*` 为框架内置页（authentication/fallback/system）；业务页放 `views/<模块>/` |
| `store/` | Pinia 状态 | app 私有 store；`store/index.ts` 统一 `export *` |
| `router/` | 路由 | `router/index.ts` 装配；`router/guard.ts` 守卫；`router/access.ts` 动态路由生成；`router/routes/modules/*.ts` 业务路由模块 |
| `layouts/` | 布局组件 | `basic.vue` / `auth.vue`，`index.ts` 导出 |
| `locales/` | 国际化 | `langs/<lang>/*.json` |
| `adapter/` | 组件适配层 | `form.ts` / `vxe-table.ts` / `component/` — 封装 Vben 表单/表格组件 |
| `types/` | app 级类型声明 | `*.d.ts` |
| `store/`、`views/`、`api/` | — | 就近组织：一个业务模块的 api / view / 类型尽量成组 |

## 2. 文件命名规范（来自真实文件）

- **Vue 页面组件**：小写短横线或小写单词，`.vue`。真实示例：`user.vue` `role.vue` `menu.vue` `code-login.vue` `forget-password.vue` `not-found.vue`。多单词用 **kebab-case**。
- **目录名**：小写短横线。示例：`_core` `authentication` `fallback`。
- **TS 文件**：小写短横线或小写单词。示例：`auth.ts` `guard.ts` `access.ts` `vxe-table.ts`。
- **路由模块**：`router/routes/modules/<模块名>.ts`，示例 `dashboard.ts` `system.ts`。
- **API 模块**：`api/core/<模块名>.ts`，示例 `user.ts` `role.ts` `menu.ts` `auth.ts`；类型集中在 `api/core/types.ts`。
- **组件内部 name**：每个页面组件必须 `defineOptions({ name: 'XxxYyy' })`，用 **PascalCase**，且需与路由 `name` 一致（KeepAlive 依赖 name 匹配）。示例：`SystemUser` `SystemRole` `Dashboard`。

## 3. 路径别名

- `#/` → 当前 app 的 `src/`。示例：`import { requestClient } from '#/api/request'`、`import { $t } from '#/locales'`。
- `@frontend/*` → packages 重导出层（constants / hooks / preferences / stores / utils / request / common-ui / plugins / access / locales / types）。
- `@frontend-core/*` → `packages/@core/*` 底层（typings / form-ui / shadcn-ui 等）。
- **禁止**跨 app 相对路径引用（`../../其他app`）。app 内用 `#/`，跨包用 `@frontend/*`。

## 4. `<script setup lang="ts">` 内部组织顺序

真实页面（user.vue / role.vue）统一采用此顺序，新建页面照此排列：

```vue
<script lang="ts" setup>
// 1. 类型导入（type-only import 单独成组，放最前）
import type { FormInstance, FormRules } from 'element-plus';
import type { RoleOut, UserCreate, UserOut, UserUpdate } from '#/api';

// 2. Vue 运行时导入
import { computed, nextTick, onMounted, reactive, ref } from 'vue';

// 3. 框架/UI 组件导入（@frontend/* 在前，element-plus 在后）
import { Page } from '@frontend/common-ui';
import { ElButton, ElCard, ElDialog, ElForm, ElMessage, ElTable } from 'element-plus';

// 4. 业务 api / locales 导入（#/*）
import { createUserApi, deleteUserApi, getUserListApi } from '#/api';

// 5. defineOptions（必须，声明组件 name）
defineOptions({ name: 'SystemUser' });

// 6. 响应式状态（ref / reactive），按功能块分组并加注释分隔
// ---- 列表状态 ----
const loading = ref(false);
const list = ref<UserOut[]>([]);
const query = reactive({ page: 1, page_size: 10, username: '' });

// 7. computed
const flatMenuMap = computed(() => { /* ... */ });

// 8. 方法（业务函数，按 加载 / CRUD / 搜索 分组注释）
async function loadList() { /* ... */ }

// 9. 生命周期钩子放最后
onMounted(() => {
  loadList();
});
</script>

<template>
  <!-- 顶层统一用 Page 包裹 -->
</template>
```

**import 分组约定**（真实代码严格遵守，oxlint 会校验）：
1. `import type` 全部提到最前，与运行时 import 之间空行分隔。
2. 运行时 import 按来源分组，组间空行：`vue` → `@frontend/*` → 第三方(`element-plus`/`pinia`) → `#/*`。
3. 组内成员按字母序（oxfmt 自动排序）。

## 5. 硬性禁止

- 禁止读取/修改 `dist/ build/ .output/ .vite/ .cache/ .turbo/ node_modules/` 及任何 `.gitignore` 匹配项。
- 禁止在 app 之间互相 import。
- 禁止绕过 `#/` 别名写深层相对路径。

## 相关规范

- 路由与 name 一致性 → `02-router-meta.md`
- 类型存放位置 → `08-ts-types.md`
- 跨包依赖方向 → `09-monorepo-deps.md`
