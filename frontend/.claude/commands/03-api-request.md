---
description: 网络请求层与 Mock 规范 - 写接口、调用后端、配置 mock 时加载
---

# 03 · 网络层（请求 + Mock）约束

> 依据 `apps/web-admin/src/api/*` 与 `packages/effects/request/src` 真实代码。

## 1. 两个请求客户端实例

`api/request.ts` 导出两个实例，按场景选用：

```ts
import { baseRequestClient, requestClient } from '#/api/request';
```

| 实例 | responseReturn | 用途 |
| --- | --- | --- |
| `requestClient` | `'data'` | **默认用它**。自动解包到 `data` 字段，带 token 注入、401 刷新、错误弹窗 |
| `baseRequestClient` | `'raw'`(默认) | 需要原始响应/绕过解包的少数场景，如 refresh/logout（带 `withCredentials`） |

## 2. 标准调用格式 + 泛型约束

**泛型写在方法上**，指定返回数据类型。api 函数按模块放 `api/core/<模块>.ts`，用 `const BASE` 统一前缀：

```ts
import type {
  PaginatedResponse, UserCreate, UserListParams, UserOut, UserUpdate,
} from './types';

import { requestClient } from '#/api/request';

const BASE = '/users';

// GET 列表：params 走 config.params
export async function getUserListApi(params: UserListParams) {
  return requestClient.get<PaginatedResponse<UserOut>>(BASE, { params });
}

// GET 详情
export async function getUserApi(userId: number) {
  return requestClient.get<UserOut>(`${BASE}/${userId}`);
}

// POST 创建：第二参为 body
export async function createUserApi(data: UserCreate) {
  return requestClient.post<UserOut>(BASE, data);
}

// PUT 更新
export async function updateUserApi(userId: number, data: UserUpdate) {
  return requestClient.put<UserOut>(`${BASE}/${userId}`, data);
}

// DELETE
export async function deleteUserApi(userId: number) {
  return requestClient.delete(`${BASE}/${userId}`);
}
```

**约定**：
- 函数命名 `<动词><资源>Api`，如 `getUserListApi` `createRoleApi` `assignUserRolesApi`。
- 返回类型泛型必填，禁止裸 `any`（分页统一 `PaginatedResponse<T>`）。
- GET 查询参数放 `{ params }`；POST/PUT body 是第二个参数。
- 每个模块 `api/core/index.ts` 里 `export *`，最外层 `api/index.ts` 再 `export * from './core'`，页面统一 `import { xxxApi } from '#/api'`。

## 3. 方法全集（RequestClient 真实 API）

```ts
requestClient.get<T>(url, config?)               // GET
requestClient.post<T>(url, data?, config?)       // POST
requestClient.put<T>(url, data?, config?)        // PUT
requestClient.delete<T>(url, config?)            // DELETE
requestClient.request<T>(url, config)            // 通用
requestClient.upload<T>(url, { file, ...fields }, config?)  // 文件上传(multipart)
requestClient.download<T = Blob>(url, config?)   // 文件下载(blob)
requestClient.requestSSE(url, config)            // SSE 流
requestClient.postSSE(url, data, config)         // POST SSE 流
```

**上传**：
```ts
await requestClient.upload('/materials/upload', { file: rawFile, type: 'doc' });
// 自动包 FormData + Content-Type: multipart/form-data
```

**下载 blob**：
```ts
const blob = await requestClient.download('/export/users', { params: { ids } });
```

## 4. 拦截器与错误处理（已在 request.ts 配好，勿重复加）

`api/request.ts` 已注册以下链路，**业务代码无需再处理**：

1. **请求拦截**：注入 `Authorization: Bearer <token>` 和 `Accept-Language`。
2. **响应解包**（`defaultResponseInterceptor`）：约定 `{ code: 0, data, message }`，`successCode: 0`，`codeField: 'code'`，`dataField: 'data'`。
3. **token 过期**（`authenticateResponseInterceptor`）：401 自动刷新 token（`enableRefreshToken`）或跳登录。
4. **统一错误弹窗**（`errorMessageResponseInterceptor`）：提取后端 `message`/`error`/`detail[0].msg` 用 `ElMessage.error` 弹出。

所以业务层直接 `await xxxApi()` 拿数据即可，失败会自动弹窗；只在需要额外处理时 try/catch。

## 5. Mock 规范

### ⚠️ 现状（与 CLAUDE.md 存在出入）

- CLAUDE.md 称「Mock 所有环境启用（含生产）」——这是**上游 Vben 的默认描述**。
- **本项目实际**：`web-admin` 通过 Vite 代理连**真实后端**（`.env.development` 中 `VITE_GLOB_API_URL=/api`，`vite.config.ts` 代理 `/api` → `http://127.0.0.1:8000/admin/api/v1`）。
- Nitro Mock 插件受 `VITE_NITRO_MOCK` 控制且仅 dev 生效（`nitroMock: !isBuild`），依赖 `@frontend/backend-mock` 包——**该包在当前 fork 未创建**，插件会跳过。
- 生产环境 `.env.production` 指向 `https://mock-napi.vben.pro/api`（上游演示地址），**需按实际部署改成真实后端**。

### 结论 / 约定

- **优先对接真实后端**（改 `.env.*` 的 `VITE_GLOB_API_URL` 与代理 target）。
- 若确需本地 Mock：新建 `apps/backend-mock`（包名 `@frontend/backend-mock`），用 nitropack 的 `eventHandler` 写 handler，再由 `viteNitroMockPlugin` 自动接管；同步把 CLAUDE.md 的 mock 描述改成与实现一致。
- 不要在业务代码里手写 mock 分支（如 `if (import.meta.env.DEV) return fakeData`），mock 必须走 nitro 层，保持业务代码干净。

## 相关规范

- 请求/响应类型定义 → `08-ts-types.md`
- 拦截器里用 store（token） → `04-state-pinia.md`
- 登录/权限接口 → `11-access-control.md`
