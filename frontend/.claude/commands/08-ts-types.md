---
description: 业务类型定义与存放规范 - 定义接口/模型类型时加载
---

# 08 · 类型系统约束

> 依据 `apps/web-admin/src/api/core/types.ts` 真实代码。

## 1. 业务类型存放位置

- **API 请求/响应模型**：集中在 `api/core/types.ts`，一个 app 一个集中类型文件，按业务模块用注释分段：
  ```ts
  // ========== User ==========
  export interface UserOut { ... }
  // ========== Role ==========
  export interface RoleOut { ... }
  ```
- 通过 `api/core/index.ts` 的 `export * from './types'` 统一对外，页面里 `import type { UserOut } from '#/api'`。
- **app 级全局声明**（`.d.ts`）放 `src/types/`，如 `element-plus-style-css.d.ts`。
- **跨包通用类型**来自 `@frontend/types`（Recordable / ClassType / GenerateMenuAndRoutesOptions 等），不要在 app 内重复定义。

## 2. 命名规范（来自真实代码）

后端 DTO 风格，按用途加后缀：

| 后缀 | 含义 | 示例 |
| --- | --- | --- |
| `*Out` | 后端返回的输出模型 | `UserOut` `RoleOut` `MenuOut` |
| `*Create` | 创建入参 | `UserCreate` `RoleCreate` |
| `*Update` | 更新入参 | `UserUpdate` `RoleUpdate` |
| `*ListParams` | 列表查询参数 | `UserListParams` `RoleListParams` |
| `*Request` / `*In` | 其他请求体 | `LoginRequest` `AssignRolesRequest` `GenerateIn` |
| `*Response` | 通用响应包装 | `TokenResponse` `PaginatedResponse<T>` |

字段命名沿用后端 **snake_case**（`page_size` `is_active` `menu_ids` `refresh_token`），不要转 camelCase——请求/响应直接对应后端契约。

## 3. 通用响应与分页类型（复用，勿重写）

```ts
export interface BizResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string | null;
  sort_order?: 'asc' | 'desc';
}
```

列表参数类型统一继承 `PaginationParams`：
```ts
export interface UserListParams extends PaginationParams {
  username?: string;
  is_active?: boolean;
}
```

## 4. 类型使用约定

- 优先 `import type { ... }`（type-only import），与运行时 import 分组分开（见 `01-architecture.md`）。
- 可空字段用 `T | null`（匹配后端），可选入参用 `?:`。
- 联合字面量类型抽出复用：`export type TaskStatusLiteral = 'pending' | 'running' | 'completed' | 'failed';`
- 禁止滥用 `any`；确需时局部 `as any` 并加注释说明原因（真实代码中树形数据 `as any` 属临时妥协，非鼓励）。

## 相关规范

- api 函数如何用这些类型做泛型 → `03-api-request.md`
- 表单/表格里引用模型类型 → `05-comp-table.md` / `06-comp-form.md`
