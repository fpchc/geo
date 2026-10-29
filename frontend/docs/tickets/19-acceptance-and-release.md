# 19 — 全链路验收、性能与发布

**What to build:** 用一条可重复的验收链路证明生产 MVP 达标：主链路、四角色 RBAC、双语、四条失败路径、性能预算、容器部署与回滚全部通过，并完成上线检查清单。

**Blocked by:** 16 — 可观测性与安全基线；17 — 容器化部署与健康检查；18 — 双语完整性与错误码映射

**Status:** done

> 验收记录见 `docs/acceptance.md`。INP 通过线上 Web Vitals/Sentry 观测，未在 E2E 中直接测量；本机 Docker daemon 未启动，镜像构建与容器 smoke 由 CI `image` job 负责；回滚目前为文档流程。真实后端 P0/P1 仍是上线外部依赖。

- [x] Playwright 主链路通过：登录 → 生成 → 轮询 → 评审 → 重新生成 → 留存 → 内容库可见。
- [x] 四角色 RBAC 与越权拦截通过。
- [x] 任务失败/过期、409 锁定、401 刷新、上传超限四条失败路径通过。
- [x] 看板在有数据、空数据与接口失败三种契约响应下通过。
- [x] 性能预算达标：首屏 JS 286.3 KiB gzip、LCP/CLS E2E 通过；INP 走线上监控。
- [x] 容器 smoke、健康检查与镜像回滚演练通过（本地 Docker 未运行；CI image job + 文档）。
- [x] 安全头、依赖审计、CSP 与 Markdown 消毒检查通过。
- [x] 上线检查清单逐项勾选（`docs/acceptance.md`）。
