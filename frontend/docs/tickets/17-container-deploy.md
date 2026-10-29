# 17 — 容器化部署与健康检查

**What to build:** 应用可构建为独立的 Node 容器，以非 root 运行；启动时校验必需环境变量；健康检查可用；镜像带版本并可回滚到上一版本；`/api` 由 BFF 处理并转发到后端。

**Blocked by:** 01 — 单体应用骨架与契约测试缝

**Status:** done

> 本机 Docker daemon 未启动，未能在本地构建镜像；已用 `node .next/standalone/server.js` 验证 standalone 运行时与健康端点。CI 的 `image` job 会构建镜像并做容器 smoke test。

- [x] standalone 构建产物可运行。
- [x] Dockerfile 多阶段构建，非 root 用户，仅包含运行产物。
- [x] 健康检查端点能反映应用状态与后端依赖状态。
- [x] 缺少必需环境变量时启动失败并给出明确原因。
- [x] 镜像带版本标签；保留上一版本，回滚只切镜像。
- [x] `/api` 反代与 TLS 入口配置有文档。
- [x] CI 能构建镜像并运行健康检查。
