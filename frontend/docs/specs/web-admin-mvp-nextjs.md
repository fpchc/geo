---
title: web-admin 生产 MVP（Next.js 单体架构）
status: ready-for-agent
labels: [ready-for-agent]
created: 2026-10-22
---

## Problem Statement

内容运营团队需要一个可上线的管理后台，用来完成「生成 → 评审 → 重新生成 → 留存」的内容主链路、查询内容库、查看运营看板，并管理用户、角色与菜单。现有 web-admin 是 Vue 3 / Vben 5.7 的 POC：生成页依赖后端并不存在的 SSE 接口，内容状态枚举与后端不一致，看板没有聚合数据，导航仍由前端静态路由控制，且缺少双语、CI、E2E 与错误监控。与此同时，3–5 人的团队维护一套 Vben monorepo（多层 packages、Element Plus 封装、Pinia、Nitro 约定）的成本高于收益。

团队决定整体删除现有 Vue 前端，用单体 Next.js 应用重写 web-admin：保留 FastAPI 后端与既有契约，不保留 monorepo 与前端组件库分层，用 React Server Components 承担首屏数据、用一套 typed client 收敛所有 API 访问，并以容器化方式交付生产 MVP。

## Solution

交付一个从零构建的独立 Next.js 16 App Router 应用，整体取代现有 Vue 版 web-admin：

- **单体架构**：一个应用、一个部署单元，不使用 pnpm workspace、Turborepo 或共享 packages。
- **服务端优先**：RSC 直取首屏数据；客户端交互、轮询与 mutation 使用 TanStack Query v5；Zustand 只存 UI 状态。
- **BFF 认证**：Next.js Route Handlers 代理登录与刷新，token 只存 httpOnly cookie；middleware 在 access token 过期时刷新，浏览器 JS 不接触 token。
- **契约驱动**：以 OpenAPI 生成类型，服务端薄客户端统一解包 `BizResponse`、分页与错误；CI 检查契约漂移。
- **后端 RBAC**：`accessMode` 为 backend，菜单树驱动导航，权限码控制页面与按钮。
- **提交 + 轮询**：内容生成沿用后端「提交生成 → 任务轮询 → 读取详情」链路，不在 MVP 引入 SSE。
- **完整交付**：中英双语、Sentry + Web Vitals、Playwright E2E、Vitest + RTL + MSW、Biome + ESLint、Node standalone 容器。

现有 frontend 代码与 monorepo 整体删除，从空目录初始化单体应用；不保留 Vue/Vben 兼容层，不做双跑、迁移或逐页替换。

## User Stories

### 认证与会话

1. As a 内容运营，I want 用账号密码登录，so that 我可以进入管理后台。
2. As a 内容运营，I want 登录后回到我原本要访问的页面，so that 我不会丢失操作上下文。
3. As a 内容运营，I want 刷新页面后保持登录，so that 我不需要反复输入密码。
4. As a 内容运营，I want access token 过期时被静默刷新，so that 我的操作不会中断。
5. As a 内容运营，I want 刷新失败时被带回登录页并看到原因，so that 我知道需要重新登录。
6. As a 内容运营，I want 主动退出登录，so that 共用设备不会保留我的会话。
7. As a 内容运营，I want 看到账号或密码错误的明确提示，so that 我可以重试而不是怀疑系统故障。
8. As a 内容运营，I want 看到账号被禁用的提示，so that 我知道要联系系统管理员。
9. As a 内容运营，I want 在无权限访问某页时看到 403 说明，so that 我理解这是权限限制而不是页面崩溃。
10. As a 系统管理员，I want 在用户管理中重置某个用户的密码，so that 用户忘记密码时可以恢复访问。
11. As a 系统管理员，I want 重置密码前二次确认，so that 我不会误操作到错误账号。
12. As a 安全负责人，I want token 只存放在 httpOnly cookie 中，so that XSS 无法读取会话凭证。
13. As a 安全负责人，I want 所有写操作校验来源，so that CSRF 不能借我的会话提交数据。

### 导航与权限

14. As a 内容运营，I want 侧边导航只显示我的角色可见的菜单，so that 我不会被无关入口干扰。
15. As a 内容运营，I want 直接输入无权访问的 URL 时被拦截，so that 我不能绕过菜单隐藏。
16. As a 内容运营，I want 没有权限的按钮被隐藏或禁用，so that 我不会触发必然失败的请求。
17. As a 内容查看者，I want 只读地浏览内容库与内容详情，so that 我可以了解内容情况而不误改数据。
18. As a 内容运营，I want 使用内容工作台、内容库与内容设置中我有权限的部分，so that 我可以完成日常内容生产。
19. As a 系统管理员，I want 进入系统管理维护用户、角色与菜单，so that 权限体系可以持续运营。
20. As a 超级管理员，I want 看到并使用全部菜单与操作，so that 我可以处理例外情况。
21. As a 内容运营，I want 菜单名称、图标与层级来自后端菜单树，so that 管理员调整菜单后前端自动生效。
22. As a 内容运营，I want 菜单变更在下次进入或刷新后生效，so that 我不需要等待前端发版。
23. As a 内容运营，I want 页面标题与面包屑和当前菜单一致，so that 我知道自己所在的位置。
24. As a 内容运营，I want 菜单加载失败时看到可重试的错误态，so that 我不会面对空白侧边栏。
25. As a 系统管理员，I want 当菜单指向不存在的页面组件时看到明确告警，so that 我可以修正菜单或补页面。
26. As a 内容运营，I want 登录后默认进入运营看板，so that 我先看到整体运营情况。

### 内容工作台

27. As a 内容运营，I want 只看到启用状态的智能体，so that 我不会选择不可用的生成角色。
28. As a 内容运营，I want 查看所选智能体的基础提示词（只读），so that 我理解生成内容的风格与边界。
29. As a 内容运营，I want 填写受众、发布平台、行业领域、创作角度，so that 生成内容符合目标场景。
30. As a 内容运营，I want 以标签形式添加多个关键词，so that 生成内容覆盖我必须命中的词。
31. As a 内容运营，I want 关键词自动去空格、去重并校验非空，so that 我不会提交无效的关键词集合。
32. As a 内容运营，I want 用滑块或输入框设置目标字数，so that 输出长度符合要求。
33. As a 内容运营，I want 选填额外提示词并看到长度上限，so that 我可以在默认风格上做局部调整。
34. As a 内容运营，I want 上传资料并在上传前校验格式与大小，so that 我不会等到生成失败才发现文件不合格。
35. As a 内容运营，I want 在生成前移除已上传的资料，so that 我可以纠正误传。
36. As a 内容运营，I want 看到资料上传的进度与失败原因，so that 我知道文件是否可用。
37. As a 内容运营，I want 提交生成时自动携带幂等键，so that 网络重试不会产生重复内容。
38. As a 内容运营，I want 提交后立即看到生成中状态与已用时间，so that 我知道任务已在执行。
39. As a 内容运营，I want 页面自动轮询任务状态，so that 我不需要手动刷新。
40. As a 内容运营，I want 轮询在任务完成或失败后停止，so that 我不会产生无意义的请求。
41. As a 内容运营，I want 刷新或离开页面后能恢复进行中的任务，so that 我不会因为误刷新而丢失生成结果。
42. As a 内容运营，I want 任务失败或过期时看到明确原因与重试入口，so that 我可以继续而不是重新填表。
43. As a 内容运营，I want 生成成功后看到安全的 Markdown 预览，so that 我可以检查正文而不是看到原始标记。
44. As a 内容运营，I want 对当前版本发起评审，so that 我得到关键词覆盖评分。
45. As a 内容运营，I want 看到总分、等级与各维度得分，so that 我知道内容是否达到要求。
46. As a 内容运营，I want 评审失败时看到可重试的错误，so that 我不会误以为内容没有评分。
47. As a 内容运营，I want 对已评审内容重新生成，so that 我可以改进内容。
48. As a 内容运营，I want 看到剩余重新生成次数，so that 我知道还能尝试几次。
49. As a 内容运营，I want 重新生成次数达上限时看到锁定状态，so that 我不会反复触发必然失败的请求。
50. As a 内容运营，I want 锁定后只能留存，so that 我仍能交付已产出的版本。
51. As a 内容运营，I want 留存前二次确认，so that 我不会误把未确认的版本定为最终内容。
52. As a 内容运营，I want 留存成功后状态立即更新，so that 我知道内容已经交付。
53. As a 内容运营，I want 工作台清晰展示当前处于配置、生成中、生成失败、已生成、已评审、已锁定还是已留存，so that 我知道下一步能做什么。
54. As a 内容运营，I want 生成失败的重试与重新生成都计入次数，so that 计数口径与后端一致。
55. As a 内容运营，I want 在没有后端导出接口时看不到导出按钮，so that 我不会点击一个必然失败的入口。
56. As a 内容运营，I want 表单校验错误定位到具体字段，so that 我可以快速修正。
57. As a 内容运营，I want 离开未提交的工作台时得到提醒，so that 我不会丢失已填参数。

### 内容库

58. As a 内容运营，I want 分页浏览内容列表，so that 我可以管理大量内容。
59. As a 内容运营，I want 按状态与智能体筛选，so that 我可以快速定位目标内容。
60. As a 内容运营，I want 筛选条件反映在 URL 中，so that 刷新或分享链接后仍保持筛选。
61. As a 内容运营，I want 打开内容详情查看当前版本正文，so that 我可以复核内容。
62. As a 内容运营，I want 查看版本列表并识别当前版本，so that 我知道评审与留存针对的是哪一版。
63. As a 内容运营，I want 查看最新评分，so that 我不用重新评审就能了解质量。
64. As a 内容查看者，I want 详情页为只读，so that 我不会看到无法使用的操作按钮。
65. As a 内容运营，I want 列表与详情有加载、空态与错误态，so that 我知道数据是加载中、没有还是失败了。
66. As a 内容运营，I want 列表分页与筛选在返回时保留，so that 我不会丢失浏览位置。

### 内容设置

67. As a 内容管理员，I want 查看当前默认提示词，so that 我了解生成基线。
68. As a 内容管理员，I want 编辑并保存默认提示词，so that 我可以调整生成风格。
69. As a 内容管理员，I want 查看并编辑评分规则，so that 我可以调整评审标准。
70. As a 内容管理员，I want 保存前校验必填与长度，so that 我不会提交无效配置。
71. As a 内容管理员，I want 保存成功与失败都有明确反馈，so that 我知道配置是否生效。
72. As a 内容查看者，I want 在只有查询权限时只读查看设置，so that 我可以核对配置而不修改。
73. As a 内容运营，I want 没有设置权限时看不到设置菜单，so that 导航与权限一致。

### 运营看板

74. As a 运营负责人，I want 看到内容产量、生成成功率、评分分布与关键词覆盖等核心指标，so that 我可以判断内容生产是否健康。
75. As a 运营负责人，I want 看到内容状态分布，so that 我知道有多少内容停留在生成、评审或锁定状态。
76. As a 运营负责人，I want 看到重新生成与留存的趋势，so that 我可以评估内容迭代效率。
77. As a 运营负责人，I want 按时间范围与智能体筛选，so that 我可以聚焦特定周期或内容类型。
78. As a 运营负责人，I want 默认时间范围与所在时区明确，so that 我的解读不会与数据口径错位。
79. As a 运营负责人，I want 看板在加载时显示骨架屏，so that 页面不会闪烁或跳动。
80. As a 运营负责人，I want 看板无数据或接口失败时有明确空态与错误态，so that 我不会把空数据误读为零产出。
81. As a 运营负责人，I want 看板保持只读且不支持下钻，so that MVP 范围可控。
82. As a 运营负责人，I want 手动刷新看板而不整页刷新，so that 我可以快速核对最新数据。

### 系统管理

83. As a 系统管理员，I want 分页浏览用户列表，so that 我可以管理全部账号。
84. As a 系统管理员，I want 创建用户并设置用户名、密码、昵称、邮箱、电话与角色，so that 新成员可以入职。
85. As a 系统管理员，I want 编辑用户资料与启用状态，so that 我可以维护账号信息。
86. As a 系统管理员，I want 给用户分配角色，so that 用户获得对应菜单与操作权限。
87. As a 系统管理员，I want 删除用户前二次确认，so that 我不会误删账号。
88. As a 系统管理员，I want 分页浏览角色列表，so that 我可以管理全部角色。
89. As a 系统管理员，I want 创建、编辑、删除角色，so that 权限模型可以随组织调整。
90. As a 系统管理员，I want 给角色分配菜单，so that 角色决定可见导航与按钮。
91. As a 系统管理员，I want 以树形结构查看与编辑菜单，so that 我可以维护目录、菜单与按钮节点。
92. As a 系统管理员，I want 设置菜单名称、路径、图标、排序与可见性，so that 导航符合运营需要。
93. As a 系统管理员，I want 在菜单或按钮节点上维护权限码，so that 页面与按钮权限有统一来源。
94. As a 系统管理员，I want 创建菜单时校验父节点与路径，so that 我不会制造无效层级。
95. As a 系统管理员，I want 删除菜单或角色前看到影响提示，so that 我不会破坏现有权限。
96. As a 系统管理员，I want 所有写操作成功或失败都有明确反馈，so that 我知道数据是否已保存。
97. As a 超级管理员，I want 系统管理中的破坏性操作受保护，so that 关键账号与菜单不会被误删。

### 双语与体验

98. As a 内容运营，I want 在中文与英文之间切换，so that 我可以按团队习惯使用界面。
99. As a 内容运营，I want 语言选择在刷新与下次登录后保持，so that 我不需要反复切换。
100. As a 内容运营，I want 业务文案全部有中英两版，so that 切换后不会出现中文夹英文。
101. As a 内容运营，I want 日期、时间、数字按当前语言格式化，so that 数据表达符合语言习惯。
102. As a 内容运营，I want 已知后端错误码有翻译后的提示，so that 我不会看到生硬的英文或技术错误。
103. As a 内容运营，I want 未知错误保留可读的原始信息，so that 我可以向管理员反馈。
104. As a 内容运营，I want 页面使用统一的加载、空态与错误组件，so that 各处体验一致。
105. As a 内容运营，I want 可以用键盘完成主要操作并看到清晰焦点，so that 我不依赖鼠标。
106. As a 内容运营，I want 在 ≥1280px 桌面屏幕上正常使用，so that 日常运营不受布局限制。

### 工程与交付

107. As a 开发者，I want 所有 API 调用都有 OpenAPI 生成的类型，so that 字段变更在编译期暴露。
108. As a 开发者，I want 契约漂移让 CI 失败，so that 前后端不会静默不一致。
109. As a 开发者，I want 所有数据访问走同一个 typed client，so that 认证、错误解包与分页逻辑只有一处。
110. As a 开发者，I want 纯逻辑与组件测试在同一个 HTTP 缝上替换后端，so that 测试不依赖真实模型或数据库。
111. As a 开发者，I want E2E 覆盖主链路、RBAC、双语与失败路径，so that 发版前能验证用户可见行为。
112. As a 开发者，I want Sentry 捕获浏览器与服务端错误并关联 release，so that 线上问题可定位。
113. As a 开发者，I want Web Vitals 上报，so that 性能退化可被发现。
114. As a 发布负责人，I want 一个 standalone Node 容器与健康检查，so that 应用可以独立部署。
115. As a 发布负责人，I want 回滚到上一个镜像，so that 发布失败可以快速恢复。
116. As a 安全负责人，I want CSP、X-Frame-Options、HSTS 等安全头，so that 常见浏览器攻击面被收紧。
117. As a 安全负责人，I want Markdown 在渲染前消毒，so that 模型输出不能注入脚本。
118. As a 安全负责人，I want 上传在客户端与服务端双重校验，so that 非法文件不能进入系统。
119. As a 安全负责人，I want 浏览器端代码不包含 token 或敏感密钥，so that 前端泄露不会直接导致会话被盗。

## Implementation Decisions

### 架构与边界

- **单体应用**：新建一个独立的 Next.js 应用，不使用 pnpm workspace、Turborepo、共享 packages 或跨应用引用。应用内部按业务域组织模块（认证、内容、看板、系统管理、共享 UI），域之间通过显式接口交互。
- **全量重写而非重构**：删除现有 frontend 工作树中的全部代码、依赖清单与 monorepo 配置，从空目录初始化单体应用；不保留 Vue/Vben/Element Plus/Pinia/Nitro 兼容层，不做页面级混跑、双写或渐进迁移。Git 历史只作为只读记录，不作为实现参考或回退依据。
- **后端不变**：FastAPI 的路径、请求/响应结构与状态枚举保持现有契约；前端只新增类型生成与 BFF 代理。
- **服务端/客户端边界**：所有服务端数据访问集中在 server-only 模块；客户端组件不得直接拼装后端 URL 或读取 token。用构建期约束阻止把 server-only 模块打进客户端 bundle。
- **运行时**：Node.js 20.19+；Next.js 16.3 App Router；Turbopack；React 19.2+ 并开启 React Compiler；TypeScript strict。

### 认证与会话

- **BFF 模式**：登录、刷新、退出通过 Next.js Route Handlers 调用后端；后端返回的 access/refresh token 写入 httpOnly、Secure（生产）、SameSite=Lax 的 cookie，浏览器 JS 不可读。
- **刷新策略**：middleware 在 access token 即将过期时调用后端刷新并更新 cookie；刷新采用单飞（同一会话并发请求只触发一次刷新）。若部署多副本，单飞需要跨进程协调（Redis 或粘性会话），MVP 先按单副本交付并在部署文档中标注限制。
- **401 处理**：服务端数据访问遇到 401 时先尝试一次刷新，失败则清理会话并跳转登录；客户端请求通过 BFF 代理，不直接接触 token。
- **CSRF**：写操作校验 `Origin`/`Sec-Fetch-Site`，cookie 使用 SameSite=Lax；不引入额外的 CSRF token，除非后续安全评审要求。
- **登录范围**：仅账号密码。验证码、短信/邮箱验证码、注册、二维码登录、企业 SSO 均不在 MVP；后端当前也没有对应接口。
- **密码重置**：MVP 由系统管理员在用户管理中调用后端重置接口完成；自助改密是否加入取决于 ticket 04，若后端不新增接口则不提供入口。
- **登录限流/锁定**：后端未实现，前端只负责展示后端返回的 429/锁定错误；不在前端做本地锁定。

### 数据获取与状态

- **RSC 首屏**：列表、详情、看板、菜单等首屏数据在 Server Components 中直取，配合 Suspense 与骨架屏；避免客户端首屏请求瀑布。
- **客户端交互**：筛选、分页、手动刷新、轮询、mutation 使用 TanStack Query v5；query key 按「资源 + 参数」稳定命名；mutation 成功后精准失效相关 query。
- **Zustand**：只存 UI 状态（侧边栏折叠、当前语言、未提交表单草稿等）；服务端数据不得复制进 Zustand。
- **表单**：简单表单（≤8 个字段、无复杂联动）用 React Hook Form + Zod；内容工作台等复杂表单用 TanStack Form v1 + Zod。两者共享同一份 schema。
- **校验**：Zod 4 作为运行时与类型来源；BFF Route Handlers 对入参复用同一 schema；后端返回的字段错误映射到表单字段。
- **缓存**：看板与列表默认不做长时间缓存；手动刷新或 mutation 后失效。认证相关请求始终动态执行，避免把用户数据缓存到共享层。

### API 契约

- **契约源**：后端 OpenAPI 为唯一来源；用 `openapi-typescript` 生成类型并提交入库。
- **薄客户端**：服务端 client 统一处理 base URL、Authorization、`BizResponse` 解包、分页结构、错误规范化与 401 刷新；业务模块只声明「方法 + 路径 + 入参/出参」。
- **漂移检查**：CI 重新生成类型并与入库产物比较，不一致即失败；后端契约变更必须先更新 OpenAPI 再更新前端。
- **非标准请求**：multipart 上传、下载、未来导出保留手写封装，但必须复用同一错误与认证处理，不允许裸 `fetch` 绕过。
- **错误模型**：统一为 `{ status, code, message, details? }`；已知业务码映射到 i18n key，未知错误保留后端 message；401/403/409 有专门处理分支。

### RBAC 与导航

- **访问模式**：backend。登录后从后端获取当前用户可见菜单树；导航、面包屑与页面标题都由菜单树生成。
- **权限码**：页面与按钮统一使用后端菜单/按钮节点上的权限码；服务端渲染时用 `can()` 判断，客户端用 `<Can>` 包裹或禁用交互。
- **路由映射**：菜单节点的路径映射到应用内页面；未匹配到页面的菜单显示降级页并上报错误，不静默 404。
- **角色预期**：`super_admin` 全量；`system_admin` 可见系统管理；`content_ops` 可见内容工作台/内容库/内容设置并按权限码操作；`content_viewer` 只读。
- **外部依赖（P0）**：`/menus/tree` 需改为登录可读并按当前用户过滤；种子路径需对齐前端路由（`/system/users`、`/content/library` 等）并补 `/dashboard` 节点。清单见 [ticket 20](../tickets/20-backend-nav-tree-prerequisites.md)。未就绪时 `content_ops` / `content_viewer` 登录后拿不到导航。
- **种子修复**：`content_viewer` 种子引用了不存在的菜单 id（222/231/233），且缺少内容详情查询权限；上线前修复，否则只读角色无法打开详情。

### 内容生成链路

- **提交 + 轮询**：生成与重新生成都调用提交接口，拿到 `content_id` 与 `task_id`；随后轮询任务状态，终态后读取内容详情获取正文。SSE 不在 MVP。
- **状态机**：内容状态为 `configuring → generating → generate_failed | generated → reviewed → locked | retained`；UI 必须完整覆盖这 7 个状态，不沿用旧前端的 `ready/failed`。
- **轮询策略**：初始间隔约 1 秒，逐步退避到约 5 秒；设置总超时与最大次数；任务完成、失败、过期或页面卸载时停止；同一任务不并发轮询。
- **刷新恢复**：进行中的 `content_id` 与 `task_id` 写入 URL（或等价的可恢复位置），刷新后可继续轮询；任务已过期时回退到内容详情状态并提示。
- **幂等**：每次提交生成一个 `X-Idempotency-Key`，重试时复用；后端当前不强制该头，但前端必须发送，避免网络重试产生重复内容。
- **锁定与错误**：409 锁定展示剩余次数为 0、只允许留存的说明；任务失败/过期提供重试；评审失败可重试；错误文案区分「可重试」与「不可重试」。
- **留存**：只允许从 `generated`、`reviewed`、`locked` 进入；留存前确认；成功后状态变为 `retained`。
- **导出**：后端无导出接口，MVP 不渲染导出入口；契约与实现留给后续 ticket。
- **AI SDK 6**：MVP 不使用 AI SDK 调用模型，生成完全由后端负责；AI SDK 仅作为后续流式/对话能力的预留依赖，DevTools 只在开发环境启用。

### UI 与交互

- **样式**：Tailwind CSS v4 + shadcn/ui；颜色、间距、圆角使用 CSS 变量/design token，不写死 hex；亮色主题为 MVP 基线。
- **组件**：列表使用 TanStack Table（shadcn DataTable 模式）；弹窗/抽屉使用 shadcn Dialog/Sheet；Toast 用于轻量反馈；破坏性操作统一确认。
- **图表**：沿用 ECharts 决策，按需引入并客户端动态加载；图表容器固定尺寸，避免 CLS；不使用完整 ECharts 包。
- **Markdown**：使用 react-markdown 渲染，接入 rehype-sanitize；禁止原始 HTML 与脚本；代码块与长表格可横向滚动。
- **布局**：桌面优先，最小宽度 1280px；侧边导航 + 顶栏 + 内容区；不承诺移动端适配。
- **状态组件**：统一 Loading/Skeleton、Empty、Error、Forbidden 组件；错误态提供重试或返回入口。
- **无障碍**：表单控件有 label，焦点可见，弹窗有焦点陷阱与 Esc 关闭，图标按钮有可访问名称。

### 双语

- **方案**：next-intl；语言存 cookie，不使用 URL 语言前缀；RSC 与客户端组件共享同一套 message catalog。
- **范围**：业务文案 100% 中英；框架/第三方错误不强行翻译；已知后端错误码由前端映射。
- **缺 key**：开发与 CI 检查 en-US 与 zh-CN key 集合一致，缺失即失败；运行时不显示 key 本身。
- **格式化**：日期、时间、数字使用 `Intl`，时区以用户所在时区展示；看板口径在页面上显式标注时区。

### 看板

- **数据来源**：后端新增聚合 API（外部依赖，P1）；前端只定义契约与展示，不自行聚合原始列表。
- **指标**：内容产量、状态分布、生成成功率与失败原因、评分分布、关键词覆盖、重新生成/留存/锁定。
- **端点形态**：建议「概览 + 趋势」两个端点，均支持时间范围与智能体筛选；具体字段在 ticket 10 定稿。
- **交互**：只读；时间范围与智能体筛选；手动刷新；不做下钻、导出或自定义图表。
- **降级**：聚合 API 未就绪时，看板显示明确的「数据接口未就绪」空态，不伪造数据。
- **缓存**：首屏 RSC 取数，客户端筛选走 TanStack Query；默认不做跨用户共享缓存。

### 系统管理

- **用户**：分页、创建、编辑、启用/禁用、分配角色、重置密码、删除；删除与重置需确认；涉及当前登录用户的操作需要额外保护。
- **角色**：分页、创建、编辑、删除、分配菜单；角色 code 唯一；删除前提示已绑定用户。
- **菜单**：树形展示与 CRUD；节点类型为目录/菜单/按钮；路径、图标、排序、可见性、权限码可编辑；校验父子关系与循环。
- **权限码**：以后端种子与菜单节点为准；前端不维护第二份权限清单；新增页面必须同时落菜单与权限码。
- **数据刷新**：写操作成功后失效对应 query；菜单或角色变更后刷新当前用户菜单，必要时要求重新登录。

### 工程化与部署

- **Lint/Format**：Biome 2 负责格式化与通用 lint；ESLint 只保留 Next.js 与 react-hooks 规则；CI 两者都跑。
- **类型检查**：TypeScript strict，CI 跑 `tsc --noEmit`；禁止用 `any` 逃逸契约边界。
- **构建**：Turbopack；生产构建输出 standalone；静态资源带内容哈希；长缓存。
- **部署**：单个 Node 容器，非 root 运行，暴露健康检查；Nginx（或平台入口）负责 TLS 与反向代理；`/api` 由 Next.js BFF 处理，再转发到 FastAPI。
- **环境变量**：只保留后端地址、Sentry DSN、release 等必要项；不使用 `NEXT_PUBLIC_` 暴露密钥；启动时校验缺失变量并快速失败。
- **回滚**：镜像不可变 + 版本号；保留上一版本镜像；回滚只切镜像，不做数据迁移。
- **监控**：Sentry 浏览器与服务端错误、release 与 sourcemap 关联；Web Vitals 上报；日志脱敏，不记录 token、提示词全文或资料内容。
- **安全头**：CSP、X-Frame-Options/frame-ancestors、HSTS、Referrer-Policy、Permissions-Policy；CSP 需兼容 Next.js 的脚本策略。

### 重写与初始化

- 删除现有 frontend 代码后，从空目录初始化单体 Next.js 应用；旧路由、菜单、API 封装、状态管理与 UI 组件一律不复用。
- 新旧应用不并行、不双跑、不做入口切换；新应用通过 MVP 验收后直接作为唯一实现。
- 不做数据迁移、不做兼容层、不做渐进式替换；后端契约是唯一需要对齐的边界。
- 不保留旧代码回退窗口；如确需追溯旧行为，只读 Git 历史，不复制实现。

## Testing Decisions

- **好测试的标准**：只验证外部行为与用户可见结果，不验证组件内部状态、私有函数或 CSS 类名；测试命名描述行为而非实现；不写大范围快照。
- **唯一主缝**：Next.js 与 FastAPI 之间的 HTTP 边界。RSC、Server Actions、Route Handlers 与客户端请求都经过同一个 typed client；测试在这一层用 stub backend 替换真实 FastAPI。
- **E2E（Playwright）**：启动真实 Next.js 应用，指向按 OpenAPI 契约实现的 stub backend。覆盖登录/刷新/登出、菜单驱动导航、四角色权限、内容主链路（生成→轮询→评审→重新生成→留存）、双语切换、看板加载/空态/错误态、系统管理 CRUD 与失败路径（409 锁定、任务失败、401 刷新、上传超限）。
- **组件测试（Vitest + React Testing Library + MSW）**：与 E2E 共用同一组 MSW handlers；覆盖内容工作台的轮询状态机、表单校验与字段错误、权限可见性、列表筛选与分页、错误/空态。组件测试不 mock 业务模块，只 mock 网络。
- **纯逻辑测试（Vitest）**：状态机迁移、轮询退避、错误码映射、Zod schema、URL 筛选序列化；这些函数不引入新缝。
- **契约测试**：stub backend 的 handlers 必须满足生成的 OpenAPI 类型；CI 重新生成类型并检查漂移；关键响应用例校验 `BizResponse` 与分页结构。
- **测试数据**：固定智能体、内容、版本、评分与四角色账号的 fixtures；时间与随机数可注入，避免不稳定断言；不调用真实模型、不依赖真实数据库。
- **Prior art**：现有前端没有有意义的测试基线；后端 `tests/` 的 pytest 契约/单元测试是当前最接近的参考。新应用建立以 HTTP 缝为核心的测试模式，不照搬 Vue 组件测试。
- **CI 策略**：PR 跑 lint、typecheck、unit/component、E2E 冒烟；E2E 失败保留 trace/截图/视频；重试仅用于已知 flaky 场景，不掩盖真实失败；不设全局覆盖率硬门槛，按关键路径覆盖验收。
- **验收门槛**：主链路 E2E、四角色 RBAC、双语、四条失败路径全部通过；看板在 stub 契约下通过；性能预算按 ticket 01 的数值验证。

## Out of Scope

- `web-demand` / `web-supply` 的页面、账号体系与联调。
- SSE/流式生成；AI SDK 6 的实际生成调用（仅预留）。
- 导出功能与导出入口；版本回滚/设为当前版本；评分历史；内容库按用户/日期筛选；看板下钻。
- 后端实现：看板聚合 API、“我的菜单”接口、导出接口、登录限流/失败锁定、自助改密。
- 企业 SSO/OAuth、短信/邮箱验证码、注册、图形/滑块验证码。
- 移动端适配、旧版浏览器、非中英双语种。
- Monorepo、共享 packages、Vben/Element Plus/Pinia/Nitro 的保留或兼容层；旧代码的渐进迁移、双跑或回退。
- 从 Vue 应用迁移任何客户端持久化状态或本地数据。
- 重新设计后端领域模型、认证协议或数据库 schema。
- 视觉品牌重塑；MVP 只要求一致、可用的设计系统。

## Further Notes

- **与既有规划的关系**：本 spec 是整体重写，不是重构；现有 frontend 代码与 monorepo 全部删除，不保留 Vben 实现。ticket 01 的页面 in/out、缺口分级、性能门槛与验收场景继续有效。ADR 0001（后端菜单驱动）、ADR 0002（提交 + 轮询）、ADR 0003（OpenAPI 契约）在原则上仍成立，但实现从 Vue 改为 React/Next。整体重写决策已记录在 ADR 0004。
- **旧代码处理**：删除后不从 Git 回退；如需查看旧行为，只读历史，不复制代码、不引入兼容层、不把旧实现当作参考实现。
- **后端依赖排序**：P0 是 `/menus/tree` 登录可读、按用户过滤、路径对齐并补 `/dashboard`（见 ticket 20），否则非系统管理员无法登录后取导航；P1 是看板聚合 API；P2 是导出与自助改密。P0 未就绪时，新应用只能以超级管理员做内部验收，不能上线。
- **刷新并发风险**：middleware 刷新在多副本部署下存在 refresh token 轮换竞争；MVP 按单副本交付，若横向扩容需引入 Redis 单飞或粘性会话。
- **AI SDK**：若未来要把生成页做成流式，必须先推翻 ADR 0002，并让后端提供流式接口；AI SDK 本身不能替代后端的任务、次数限制与评审逻辑。
- **数据口径**：看板的时区、默认时间范围、评分维度与关键词覆盖定义需在 ticket 10 定稿；本 spec 只约束前端展示与契约边界。
- **发布方式**：当前仓库有 GitHub remote，但本机没有 `gh`，本 spec 先以本地文件发布并带 `ready-for-agent` 标签；具备 issue 工具后再同步为 GitHub issue。
