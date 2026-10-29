# 部署说明

## 组件与网络

- `web-admin`：Next.js standalone 容器，监听 `7002`。
- Nginx（或平台入口）：TLS 终止与反向代理，转发到 `web-admin:7002`。
- `backend`：FastAPI，暴露 `7001`；`web-admin` 通过 `API_BASE_URL` 访问。
- 浏览器的 `/api/*` 请求先到 Next.js BFF，再由 BFF 转发到 FastAPI；不要让 Nginx 把 `/api` 直接指向 FastAPI，否则 auth cookie 与 BFF 逻辑会被绕过。

## 构建

```bash
docker build --build-arg APP_VERSION="$(git rev-parse --short HEAD)" -t web-admin:local .
```

## 运行

```bash
docker run -d --name web-admin \
  -p 7002:7002 \
  -e NODE_ENV=production \
  -e API_BASE_URL=http://backend:7001/api/v1 \
  web-admin:local
```

生产环境必须设置 `API_BASE_URL`；缺失时应用启动失败。Sentry 变量可选，见 `.env.example`。

- `NAV_SOURCE`：默认 `static`（过渡期）。设为 `backend` 后导航、面包屑与路由守卫改由 `GET /api/v1/menus/tree` 驱动；该接口需先完成后端前置改动（`docs/tickets/20-backend-nav-tree-prerequisites.md`），否则非管理员会因 403 无法使用。

## 健康检查

- `GET /api/health`：应用存活探针；即使后端不可达也返回 200，并在 `upstream` 字段标明状态。Docker `HEALTHCHECK` 使用此端点。
- `GET /api/health/ready`：就绪探针；调用后端 `/api/v1/health/ready`，后端不可达、非 200 或 `status` 不为 `ok` 时返回 503，并透传 `components` 供排查。

## 回滚

镜像带 `org.opencontainers.image.version` 标签。保留上一版本镜像，回滚时停止当前容器并用上一 tag 启动；不涉及数据迁移。

## Docker Compose

`deploy/docker-compose.yml` 提供最小示例。`backend` 服务需由后端团队提供的镜像或从 `../../backend` 构建；数据库与 Redis 按后端 compose 配置。
