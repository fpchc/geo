# 02 — 登录、会话与 401

**What to build:** 内容运营用账号密码登录，登录后回到原本要访问的页面；刷新页面保持会话；access token 过期时静默刷新；刷新失败回到登录页；退出后清除会话。token 始终只存在 httpOnly cookie 中，浏览器 JS 不可读。

**Blocked by:** 01 — 单体应用骨架与契约测试缝

**Status:** done

- [x] 登录页校验必填；登录失败显示明确提示。后端当前对错误密码与禁用账号返回同一错误，区分两者需后端提供不同错误码（外部依赖）。
- [x] 登录成功后 token 写入 httpOnly、Secure（生产）、SameSite=Lax 的 cookie。
- [x] 未登录访问受保护页面时重定向到登录页，并保留 return URL。
- [x] access token 过期时服务端只刷新一次；刷新失败清理会话并跳转登录。
- [x] 退出登录清除会话 cookie 并回到登录页。
- [x] 写操作校验 `Origin` / `Sec-Fetch-Site`。
- [x] E2E 覆盖登录、刷新保持、过期刷新、退出与 401。
- [x] 验证码、注册、二维码登录、SSO 与自助改密不出现。
