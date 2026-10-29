---
Status: accepted
---

# Provider 运行时切换

LLM、存储与爬虫等外部依赖通过 Provider Protocol 抽象，由配置在运行时选择 mock 或真实实现；业务层只依赖 Protocol，通过工厂与依赖注入获得实例。选择该模式是为了让本地开发、测试与生产共用同一套业务代码，测试可用依赖覆盖替换 Mock，而不在业务层散落条件分支。
