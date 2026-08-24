---
description: Monorepo 依赖边界与构建规范 - 跨包引用、新增包、构建报错时加载
---

# 09 · Monorepo 依赖边界 + 构建约束

> 依据 `pnpm-workspace.yaml`、`turbo.json`、各包 `package.json`。pnpm workspace + turborepo。

## 1. Workspace 包范围

`pnpm-workspace.yaml` 的 packages glob：
```
internal/*  internal/lint-configs/*
packages/*  packages/@core/base/*  packages/@core/ui-kit/*
packages/@core/forward/*  packages/@core/*  packages/effects/*
packages/business/*  apps/*  scripts/*  docs  playground
```

## 2. 分层与依赖方向（硬约束）

**上层依赖下层，严禁反向、严禁跨 app 依赖。**

```
apps/web-*  (层6, 不发包)
   ↓ 依赖
packages/effects/*        (层5)  @frontend/*
packages/{constants,types,utils,locales,...}  (层4)  @frontend/*
   ↓ 依赖
packages/@core/ui-kit/*   (层3)  @frontend-core/*
packages/@core/{composables,preferences}  (层2)  @frontend-core/*
packages/@core/base/*     (层1)  @frontend-core/*
   ↓ 依赖
internal/*                (层0)  @frontend/* (工具链, 不发布)
```

### 包名前缀规律

| 前缀 | 层 | 含义 | 示例 |
| --- | --- | --- | --- |
| `@frontend-core/*` | 1-3 | 核心底层（框架无关的纯能力） | `@frontend-core/form-ui` `@frontend-core/typings` `@frontend-core/shadcn-ui` |
| `@frontend/*` | 0,4,5 | 业务层统一入口 + 工具链 | `@frontend/request` `@frontend/common-ui` `@frontend/utils` `@frontend/access` |

### 引用规则

- **app 只引 `@frontend/*`**，业务能力都从这层拿。极少数情况（adapter 需底层类型）才直接引 `@frontend-core/*`。
- `@frontend/*`（层4/5）负责**重导出** `@frontend-core/*`。例：`@frontend/common-ui` 重导出 `@frontend-core/form-ui` + `@frontend-core/popup-ui`。
- **禁止** app ↔ app 相互依赖。
- **禁止**下层引上层（如 `@frontend-core/*` 引 `@frontend/effects`）。
- workspace 内依赖写 `"workspace:*"`，第三方依赖统一走 `"catalog:"`（pnpm catalog，版本集中管理，禁止各包写死版本号）。

## 3. 构建工具

| 层 | 工具 | 构建脚本 |
| --- | --- | --- |
| `apps/web-*` | **Vite** | `vite build`（`pnpm build:admin`） |
| `packages/@core/*`（层1-3） | **tsdown** | `package.json` 里 `"build": "pnpm exec tsdown"` |
| `packages/effects/*` 层4/5 纯重导出包 | 通常无 build | 直接暴露 `src`（见下 exports 机制） |

### dev 直接消费源码（关键机制）

发布型包的 `exports` 用条件导出：
```jsonc
"exports": {
  ".": {
    "types": "./src/index.ts",
    "development": "./src/index.ts",   // dev 直接指向源码
    "production": "./src/index.ts",
    "default": "./dist/index.mjs"      // 消费者按产物
  }
},
"publishConfig": {                      // 发布时才切到 dist
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.mjs" } }
}
```
**含义**：开发时改 `@frontend/*` / `@frontend-core/*` 的源码**无需重新构建**，app 直接消费 `src`，热更即时生效。只有 `pnpm build` / 发布才走 tsdown 产物。

## 4. 新增一个 package 的步骤

以在 `packages/effects/` 下新增 `@frontend/foo` 为例：

1. 建目录 `packages/effects/foo/`（自动匹配 `packages/effects/*` glob，无需改 workspace 配置）。
2. `package.json` 最小骨架：
```jsonc
{
  "name": "@frontend/foo",
  "version": "5.7.0",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "dependencies": {
    "@frontend/utils": "workspace:*"
  }
}
```
   - 纯重导出/源码包（层4/5）可像 `@frontend/request` 一样不加 build 脚本，直接暴露 src。
   - 若是需要发布的 core 包（层1-3），加 `"scripts": { "build": "pnpm exec tsdown" }` + `tsdown.config.ts` + `main/module/types` 指向 `dist` + `publishConfig`。
3. `src/index.ts` 作为唯一入口，`export *` 对外。
4. 在消费方 `package.json` 加 `"@frontend/foo": "workspace:*"`，跑 `pnpm install` 链接。
5. **遵守依赖方向**：只依赖更低层的包。

## 5. 依赖健康检查（提交前必过）

`package.json` 提供检查命令：
```bash
pnpm check           # 全量：循环依赖 + 依赖规范 + 类型 + 拼写
pnpm check:circular  # vsh check-circular —— 检测循环依赖
pnpm check:dep       # vsh check-dep —— 检测依赖声明规范
pnpm check:type      # turbo typecheck
```
- **新增跨包引用后必跑 `pnpm check:circular`**，避免引入环。
- 用了未在 `package.json` 声明的包会被 `check:dep` 拦截——依赖必须显式声明，禁止隐式依赖 hoist。

## 6. turbo 构建管线

- `turbo build`：`dependsOn: ["^build"]`，先构建依赖再构建自身，产物 `dist/**`。
- 单 app 构建：`pnpm build:admin`（`--filter=@frontend/web-admin`）。
- dev：`pnpm dev:admin`（`-F @frontend/web-admin run dev`），persistent 不缓存。

## 相关规范

- app 内目录/别名 → `01-architecture.md`
- 层级职责总表 → `CLAUDE.md`
