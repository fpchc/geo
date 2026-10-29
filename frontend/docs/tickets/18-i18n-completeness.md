# 18 — 双语完整性与错误码映射

**What to build:** 全部业务页面可在中文与英文之间切换，语言选择持久化；所有业务文案都有双语 key；日期、数字与时区按当前语言格式化；已知后端错误码有翻译后的提示，未知错误保留可读信息。

**Blocked by:** 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15

**Status:** done

> 表单校验文案通过 `build*Schema(t)` 工厂注入当前语言；schema 内保留中文默认值仅供单测。`global-error.tsx` 在 intl provider 之外，保留双语兜底。看板数字使用 `Intl.NumberFormat`，当前页面没有需要格式化的日期字段。

- [x] zh-CN 与 en-US 的 key 集合一致；缺 key 时 CI 失败（`pnpm check:messages` + `.github/workflows/i18n.yml`）。
- [x] 所有业务页面没有硬编码中文或英文文案（schema 默认值与 global error 兜底除外）。
- [x] 切换语言后刷新与下次登录仍保持。
- [x] 日期、时间、数字按当前 locale 格式化。
- [x] 已知后端错误码映射为 i18n 文案；未知错误保留可读信息。
- [x] 运行时不显示 key 本身。
- [x] E2E 覆盖工作台、内容库、看板与系统页的中英切换。
