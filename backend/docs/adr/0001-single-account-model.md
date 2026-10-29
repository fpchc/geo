---
Status: accepted
---

# 单一账号模型

系统只保留 User（后台用户）一种账号，不设 `account_type`，不引入 demand/supplier 独立账号体系，也不实现三端 API。此前的 `demand_accounts` / `supplier_accounts` 方案全部取消。选择单一模型是因为当前产品只有一个管理后台；多账号类型会重复认证、权限与数据隔离逻辑。若未来出现外部用户，应作为新的上下文单独设计，而不是给 User 加类型字段。
