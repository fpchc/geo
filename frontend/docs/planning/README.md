# web-admin 生产 MVP 规划

本目录是 web-admin MVP 的 wayfinder 规划，作为排期与开工的唯一入口。

- [map.md](./map.md)：目的地、范围、事实基线、已定决策与未定项。
- [issues/](./issues/)：13 个决策 ticket；`Status: resolved` 的 ticket 内含 `## Answer`。
- [../adr/](../adr/)：难以逆转的架构决策记录。
- [../../CONTEXT.md](../../CONTEXT.md)：领域术语表。

## 工作方式

每个 ticket 一次会话：先置 `Status: claimed`，解决后写 `## Answer`、改 `Status: resolved`，并在 `map.md` 的 `Decisions so far` 追加一行。

## 当前进度

- 决策 01 已完成（2026-10-22）。
- 架构重写 spec 已产出并完成实施：[web-admin-mvp-nextjs.md](../specs/web-admin-mvp-nextjs.md)。
- 实施 tickets 19 个全部完成：[../tickets/](../tickets/)。
- 验收记录：[../acceptance.md](../acceptance.md)。
- 02–13 的 planning issue 文件保留为决策过程记录；后续排期以 tickets 与验收记录为准。
