# 01 — 单体应用骨架与契约测试缝

**What to build:** 从空目录启动一个可运行的 Next.js 单体应用，具备统一 API 访问、双语骨架、设计系统与测试/CI 基线。打开首页时，应用通过 typed client 读取后端健康状态并显示，证明「构建 → RSC → 契约 → 后端」这条竖线已经打通。

**Blocked by:** None — can start immediately.

**Status:** done

- [x] 应用可本地启动，首页显示来自后端健康接口的真实状态。
- [x] OpenAPI 生成类型并入库；typed client 统一解包 `BizResponse`、分页与错误。
- [x] Tailwind 4 + shadcn/ui 基线可用，至少一个页面使用统一布局与状态组件。
- [x] next-intl 骨架可用，zh-CN 与 en-US 各有一个示例 key。
- [x] Vitest + React Testing Library + MSW 与 Playwright 各自能跑通一个冒烟用例，且共用同一个 HTTP 缝。
- [x] Biome、ESLint、`tsc --noEmit` 与生产构建在 CI 中通过。
- [x] standalone 构建配置就绪（容器化在 ticket 17 完成）。
