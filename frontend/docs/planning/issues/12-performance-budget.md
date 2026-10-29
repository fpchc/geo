# 12 · 确定性能与包体积预算

Type: grilling
Status: open
Blocked by: 06, 10

## Question

在 ≤50 用户、≤500 篇/天的规模下，前端的性能与包体积底线是什么？

需要明确：

- ECharts 按需引入方案与替代方案；对首屏/路由 chunk 的影响。
- 构建 target 与现代浏览器矩阵（Chrome/Edge/Safari 最近两个大版本）。
- 路由懒加载、首屏体积、字体与静态资源策略。
- Lighthouse / Web Vitals 门槛（LCP、CLS、INP 等）与验证方式。
- 看板刷新、列表分页、请求缓存的性能策略。
- 性能监控如何与错误监控结合。

输出：性能预算表、验证方法、超标时的降级策略。
