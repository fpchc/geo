"""从菜单种子生成 deploy/sql/menu.sql。

运行：python -m scripts.gen_menu_sql
产物为可重复执行的 INSERT（含 ancestors），供手动导入数据库。
"""

from __future__ import annotations

from pathlib import Path

from scripts.menu_seed import FlatMenu, flatten

OUTPUT = Path("deploy/sql/menu.sql")


def _sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    escaped = value.replace("'", "''")
    return f"'{escaped}'"


def _row_values(m: FlatMenu) -> str:
    return (
        f"({m.id}, {_sql_str(m.name)}, {m.type}, {m.parent_id}, "
        f"{_sql_str(m.ancestors)}, {_sql_str(m.path)}, {_sql_str(m.icon)}, "
        f"{_sql_str(m.perm_code)}, {m.order_no}, 1)"
    )


def render() -> str:
    rows = flatten()
    lines: list[str] = [
        "-- 本文件由 scripts/gen_menu_sql.py 自动生成，请勿手动修改。",
        "-- 数据源：scripts/menu_seed.py",
        "-- 幂等导入：先删除同 ID 记录再插入。",
        "",
        "SET NAMES utf8mb4;",
        "",
    ]
    ids = ", ".join(str(m.id) for m in rows)
    lines.append(f"DELETE FROM `menus` WHERE `id` IN ({ids});")
    lines.append("")
    lines.append(
        "INSERT INTO `menus` "
        "(`id`, `name`, `type`, `parent_id`, `ancestors`, `path`, `icon`, "
        "`perm_code`, `order_no`, `visible`) VALUES"
    )
    value_rows = [f"  {_row_values(m)}" for m in rows]
    lines.append(",\n".join(value_rows) + ";")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(), encoding="utf-8")
    print(f"generated {OUTPUT} ({len(flatten())} rows)")


if __name__ == "__main__":
    main()
