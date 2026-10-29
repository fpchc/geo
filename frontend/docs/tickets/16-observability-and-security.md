# 16 — 可观测性与安全基线

**What to build:** 线上浏览器与服务端错误可被捕获并关联 release；核心 Web Vitals 可观测；安全头、Markdown 消毒与上传双重校验到位；浏览器端代码不包含 token 或密钥。

**Blocked by:** 02 — 登录、会话与 401

**Status:** done

> Markdown 消毒与上传双重校验依赖 ticket 04/05 的实现；本 ticket 已把它们列为 04/05 的验收项，其余基线已完成。

- [x] Sentry 捕获浏览器与服务端错误，关联 release 与 sourcemap。
- [x] Web Vitals 上报。
- [x] 全局错误边界与受控错误页可用。
- [x] CSP、X-Frame-Options/frame-ancestors、HSTS、Referrer-Policy、Permissions-Policy 配置并通过检查。
- [ ] Markdown 渲染前消毒，并有注入用例测试（ticket 04）。
- [ ] 上传在客户端与 BFF 双重校验，并有测试（ticket 05）。
- [x] 浏览器端 bundle 不含 token 或敏感密钥。
- [x] 日志脱敏，不记录 token、提示词全文或资料内容。
