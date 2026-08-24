# 接口幂等性规则 (X-Idempotency-Key)

> 使用场景：**新增或修改具有副作用的写接口时必须评估幂等性**。
> 前置依赖：`app/middlewares/idempotency.py` 中的 `IdempotencyMiddleware` 已由骨架提供，并在 loader 中按 `RequestMiddleware → IdempotencyMiddleware → ExceptionMiddleware → Handler` 顺序注册。

---

## 1. 何时需要幂等

按"是否会造成用户可感知的副作用重复"来判断：

| 场景 | 是否要求幂等 |
| --- | --- |
| 支付 / 退款 / 出账 / 扣库存 | **强制** |
| 创建订单 / 创建工单 / 发放优惠券 | **强制** |
| 发送短信 / 邮件 / 站内信 / Webhook | **强制** |
| 触发外部三方 API（写类） | **强制** |
| 修改用户资料 / 更新状态（可覆盖写） | 可选，天然幂等则免 |
| 纯查询 `GET` | 不需要（HTTP 语义已幂等）|
| 删除单个资源 `DELETE /res/{id}` | 可选，服务端已幂等 |

结论：**涉及资金、外呼、生成流水号、消息投递的接口一律要求携带 `X-Idempotency-Key`**；仅内部状态覆盖的更新可豁免。

---

## 2. 客户端调用约定

* 客户端在每次业务操作生成一个 UUIDv4 或雪花 ID 作为 `X-Idempotency-Key`，同一次业务重试时保持相同值。
* Key 生命周期：**24 小时**（由 `IDEMPOTENCY_TTL_SECONDS` 配置驱动，默认 86400）。
* Key 允许长度：`1 ~ 128` 字符，字符集 `[A-Za-z0-9_-]`。超出或非法字符时中间件返回 `400`。
* 建议 Key 与业务实体挂钩，例如 `pay:{order_id}:{attempt_uuid}`，便于排查。

---

## 3. 服务端行为（由中间件统一实现）

Redis Key 格式：`idem:{method}:{path}:{X-Idempotency-Key}`。

| 情形 | 行为 |
| --- | --- |
| 首次请求 | `SETNX idem:... "IN_PROGRESS"`，业务处理完成后覆写为 `{status, headers, body}` JSON，TTL 24h，正常返回响应。 |
| 处理中并发重试 | 值为 `IN_PROGRESS`，直接返回 `409`，`code = IDEMPOTENT_IN_PROGRESS`。 |
| 已完成重复请求 | 直接返回缓存的 status / headers / body，并追加响应头 `X-Idempotent-Replay: true`。 |
| 处理过程中异常 | 从 Redis 删除该 key（不缓存失败结果），异常照常抛给 `ExceptionMiddleware`。 |
| 非 POST/PUT/PATCH/DELETE | 中间件透传，不参与幂等逻辑。 |
| 请求头缺失 `X-Idempotency-Key` | 由接口本身声明是否强制（见下节）。 |

---

## 4. 接口侧的两种声明方式

### 4.1 强制幂等（推荐用于资金 / 外呼类）

在路由上加 `Depends(require_idempotency_key)`，缺失或非法 Key 时直接返回 `400`，业务函数根本不会被调用：

```python
from fastapi import APIRouter, Depends

from app.core.security import require_permission
from app.core.idempotency import require_idempotency_key

router = APIRouter(prefix="/refunds", tags=["order:refund"])


@router.post(
    "",
    summary="发起退款",
    dependencies=[
        Depends(require_permission("order:refund:create")),
        Depends(require_idempotency_key),
    ],
)
async def create_refund(body: RefundCreateIn) -> BizResponse[RefundOut]:
    ...
```

### 4.2 可选幂等（默认，无需声明）

不加 `require_idempotency_key` 依赖时，中间件仅在客户端主动携带 `X-Idempotency-Key` 时才生效；未携带则按普通请求处理。适用于修改类接口。

---

## 5. 请求体一致性校验（可选强化）

对强制幂等的接口，中间件在缓存时同时存 `body_hash = sha256(raw_body)`。收到相同 Key 的重复请求时：

* `body_hash` 匹配 → 视为幂等重放，返回缓存。
* `body_hash` 不匹配 → 返回 `422`，`code = IDEMPOTENT_KEY_CONFLICT`，提示"相同幂等 Key 携带了不同请求体"。

避免客户端复用 Key 却修改了参数导致语义偏差。

---

## 6. 业务码约定

统一在 `app/core/exceptions.py` 的错误码枚举中登记：

| code | HTTP 状态 | 含义 |
| --- | --- | --- |
| `IDEMPOTENT_IN_PROGRESS` | 409 | 相同 Key 的请求正在处理中 |
| `IDEMPOTENT_KEY_CONFLICT` | 422 | 相同 Key 但请求体不同 |
| `IDEMPOTENT_KEY_INVALID` | 400 | Key 缺失、长度或字符非法 |

---

## 7. AI 生成新接口时的自检清单

- [ ] 该接口是否属于第 1 节的"强制幂等"清单？是则加 `Depends(require_idempotency_key)`。
- [ ] 是否是 `POST/PUT/PATCH/DELETE` 且带副作用？若是"可选幂等"，无需额外声明，但需在接口文档 `description` 中提示客户端可传 `X-Idempotency-Key`。
- [ ] 未在业务函数内部再次做幂等去重逻辑（避免与中间件重复）。
- [ ] 该接口的成功响应体是可 JSON 序列化的（否则中间件无法缓存重放）。
- [ ] 若接口内部会调用外部三方写接口，业务函数需自行保证对下游的幂等（例如把 `X-Idempotency-Key` 透传给下游）。
