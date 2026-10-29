# 06 · 确定容器化部署与环境配置

Type: grilling
Status: open
Blocked by: —

## Question

前端如何容器化部署，并管理 dev/test/prod 三套环境？

需要明确：

- 环境变量 schema 与 Vite mode；`VITE_GLOB_API_URL` 等变量的唯一来源与类型声明。
- Dockerfile（多阶段构建）与 Nginx 配置：`/api` 反代、base path、静态缓存、gzip、安全头。
- 健康检查、容器编排（Docker Compose / K8s）与后端服务的网络关系。
- CORS 与同源策略；SSE 已移除后是否仍需特殊配置。
- 构建产物、版本号、回滚步骤与环境晋级流程。
- 本地开发代理与生产反代的一致性。

输出：部署蓝图、环境变量清单、Docker/Nginx 配置要点、上线/回滚步骤。
