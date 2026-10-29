# 03 · 确定 OpenAPI 类型生成与 API 层结构

Type: grilling
Status: open
Blocked by: —

## Question

`openapi-typescript` 如何接入现有 Vben 请求层，形成可维护、可检测漂移的 API 层？

需要明确：

- `openapi.json` 的获取/更新方式（后端导出、提交入库、CI 拉取）。
- 生成类型存放位置与命名；是否与 `apps/web-admin/src/api/core/types.ts` 并存或替换。
- 薄客户端如何复用 `#/api/request` 的 `requestClient`、`BizResponse`、分页与错误处理。
- 生成产物是否入库；CI 如何检测 OpenAPI 与前端类型漂移。
- 上传、下载、导出等非标准请求如何保留手写封装。
- 与 CLAUDE.md 的 import 分组、`#/` 别名、类型后缀规范如何兼容。

输出：API 层目录蓝图、生成脚本、薄客户端约定、CI 漂移检查方案、迁移清单。
