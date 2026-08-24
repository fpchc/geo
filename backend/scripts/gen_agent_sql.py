"""从智能体种子生成 doc/sql/agent.sql。

运行：python -m scripts.gen_agent_sql
产物为可重复执行的 SQL（先删后插），供手动导入数据库。
数据源：scripts/agent_seed.py（7 个固定创作智能体）。
enabled 统一置 1；created_at / updated_at 走库侧默认，SQL 不写。
"""

from __future__ import annotations

from pathlib import Path

from scripts.agent_seed import AGENTS, SeedAgent

OUTPUT = Path("doc/sql/agent.sql")


def _sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def _agent_row(a: SeedAgent) -> str:
    return (
        f"({a.id}, {_sql_str(a.name)}, {_sql_str(a.icon)}, "
        f"{_sql_str(a.description)}, 1, {_sql_str(a.prompt_template)})"
    )


def render() -> str:
    ids = ", ".join(str(a.id) for a in AGENTS)
    lines: list[str] = [
        "-- 本文件由 scripts/gen_agent_sql.py 自动生成，请勿手动修改。",
        "-- 数据源：scripts/agent_seed.py",
        "-- 幂等导入：先删除同 ID 记录再插入。",
        "",
        "SET NAMES utf8mb4;",
        "",
        f"DELETE FROM `agents` WHERE `id` IN ({ids});",
        "",
        "INSERT INTO `agents` "
        "(`id`, `name`, `icon`, `description`, `enabled`, `prompt_template`) VALUES",
        ",\n".join(f"  {_agent_row(a)}" for a in AGENTS) + ";",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(), encoding="utf-8")
    print(f"generated {OUTPUT} ({len(AGENTS)} agents)")


if __name__ == "__main__":
    main()
