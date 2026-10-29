# 05 · 确定 CI 平台与错误监控方案

Type: grilling
Status: open
Blocked by: —

## Question

CI 平台暂未定。需要为 3–5 人、8–12 周的 MVP 选一套可落地的 CI 与错误监控。

需要明确：

- CI 平台：GitLab CI / Jenkins / 公司自建平台；与 GitHub 仓库的触发方式。
- 流水线阶段：lint、typecheck、build、E2E、镜像构建、部署；缓存与并行。
- 分支保护、PR 检查、构建产物保留与版本号。
- 错误监控：Sentry SaaS / 自建 Sentry 或 GlitchTip / 公司平台；sourcemap 上传、release 关联、采样与隐私。
- 与容器化部署、回滚流程的衔接。

输出：CI/CD 与监控方案、需要的仓库配置、失败处理与告警策略。
