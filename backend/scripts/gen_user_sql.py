"""从用户 / 角色种子生成 deploy/sql/user.sql。

运行：python -m scripts.gen_user_sql
产物为可重复执行的 SQL（先删后插），供手动导入数据库。

密码在生成时用 bcrypt 哈希（截断前 72 字节，与 app/core/security/password.py
的 verify_password 行为一致），因此每次重新生成哈希值会变化，但明文密码不变。

依赖顺序：roles / users 先行，再写 role_menu / user_role 关联。
关联表遵循 app/models/rbac.py：user_role(user_id, role_id)、role_menu(role_id, menu_id)。
"""

from __future__ import annotations

from pathlib import Path

import bcrypt

from scripts.user_seed import ROLES, USERS, SeedRole, SeedUser

OUTPUT = Path("deploy/sql/user.sql")
_BCRYPT_MAX_BYTES = 72


def _hash(password: str) -> str:
    """bcrypt 哈希（与 password.py 一致，取前 72 字节）。"""
    return bcrypt.hashpw(password.encode("utf-8")[:_BCRYPT_MAX_BYTES], bcrypt.gensalt()).decode(
        "utf-8"
    )


def _sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def _bool(value: bool) -> str:
    return "1" if value else "0"


def _role_row(r: SeedRole) -> str:
    return f"({r.id}, {_sql_str(r.code)}, {_sql_str(r.name)}, {_sql_str(r.description)})"


def _user_row(u: SeedUser) -> str:
    return (
        f"({u.id}, {_sql_str(u.username)}, {_sql_str(_hash(u.password))}, "
        f"{_sql_str(u.nickname)}, {_sql_str(u.email)}, {_sql_str(u.phone)}, "
        f"{_bool(u.is_active)}, {_bool(u.is_superuser)})"
    )


def render() -> str:
    role_ids = ", ".join(str(r.id) for r in ROLES)
    user_ids = ", ".join(str(u.id) for u in USERS)

    lines: list[str] = [
        "-- 本文件由 scripts/gen_user_sql.py 自动生成，请勿手动修改。",
        "-- 数据源：scripts/user_seed.py（菜单绑定派生自 scripts/menu_seed.py）",
        "-- 幂等导入：先删除同 ID 记录及其关联再插入。",
        "-- 注意：密码为 bcrypt 哈希，每次生成值不同；admin 明文密码为 admin123456。",
        "",
        "SET NAMES utf8mb4;",
        "",
        "-- 先清理关联，避免外键悬挂",
        f"DELETE FROM `user_role` WHERE `user_id` IN ({user_ids});",
        f"DELETE FROM `role_menu` WHERE `role_id` IN ({role_ids});",
        f"DELETE FROM `users` WHERE `id` IN ({user_ids});",
        f"DELETE FROM `roles` WHERE `id` IN ({role_ids});",
        "",
        "INSERT INTO `roles` (`id`, `code`, `name`, `description`) VALUES",
        ",\n".join(f"  {_role_row(r)}" for r in ROLES) + ";",
        "",
        "INSERT INTO `users` "
        "(`id`, `username`, `hashed_password`, `nickname`, `email`, `phone`, "
        "`is_active`, `is_superuser`) VALUES",
        ",\n".join(f"  {_user_row(u)}" for u in USERS) + ";",
        "",
    ]

    # role_menu 关联
    role_menu_rows = [f"  ({r.id}, {mid})" for r in ROLES for mid in sorted(set(r.menu_ids))]
    lines.append("INSERT INTO `role_menu` (`role_id`, `menu_id`) VALUES")
    lines.append(",\n".join(role_menu_rows) + ";")
    lines.append("")

    # user_role 关联
    user_role_rows = [f"  ({u.id}, {rid})" for u in USERS for rid in sorted(set(u.role_ids))]
    lines.append("INSERT INTO `user_role` (`user_id`, `role_id`) VALUES")
    lines.append(",\n".join(user_role_rows) + ";")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(), encoding="utf-8")
    rm = sum(len(set(r.menu_ids)) for r in ROLES)
    ur = sum(len(set(u.role_ids)) for u in USERS)
    print(
        f"generated {OUTPUT}: {len(ROLES)} roles, {len(USERS)} users, "
        f"{rm} role_menu, {ur} user_role"
    )


if __name__ == "__main__":
    main()
