"""用户 / 角色种子数据：单一数据源。

供 gen_user_sql.py（生成 doc/sql/user.sql）引用，导入用户、角色及
user_role / role_menu 关联。菜单绑定从 scripts/menu_seed.py 派生，
避免与菜单树重复维护。

权限模型：无 Permission 表，角色权限 = 所绑定菜单中按钮节点的 perm_code
集合（聚合逻辑见 app/core/security/permission_cache.py，走 Redis 缓存）。超级
管理员（is_superuser=True）天然拥有全部按钮权限，其角色菜单绑定仅用于前端菜单渲染。

ID 分段（显式指定，保证可重复导入）：
- 角色 id 1–9：内置角色
- 用户 id 1–99：内置 / 演示用户，admin 固定 id=1
"""

from __future__ import annotations

from dataclasses import dataclass, field

from scripts.menu_seed import FlatMenu, flatten

# 演示用户统一默认密码（admin 除外，见下）。仅用于初始化，生产环境请立即改密。
DEFAULT_PASSWORD = "Test@123456"


@dataclass
class SeedRole:
    id: int
    code: str
    name: str
    description: str
    menu_ids: list[int] = field(default_factory=list)


@dataclass
class SeedUser:
    id: int
    username: str
    password: str
    nickname: str
    email: str | None = None
    phone: str | None = None
    is_active: bool = True
    is_superuser: bool = False
    role_ids: list[int] = field(default_factory=list)


def _all_menu_ids() -> list[int]:
    """全部菜单节点 id（目录 + 菜单 + 按钮）。"""
    return [m.id for m in flatten()]


def _subtree_menu_ids(root_id: int) -> list[int]:
    """指定顶级/父节点 id 及其全部子孙的菜单 id。

    基于 ancestors 尾分隔符匹配，避免 '0,1' 误命中 '0,10'。
    """
    rows: list[FlatMenu] = flatten()
    by_id = {m.id: m for m in rows}
    root = by_id[root_id]
    self_path = f"{root.ancestors},{root.id}" if root.ancestors else str(root.id)
    ids = [root_id]
    ids += [m.id for m in rows if m.ancestors == self_path or m.ancestors.startswith(f"{self_path},")]
    return ids


# ---- 内置角色 ----
ROLES: list[SeedRole] = [
    SeedRole(
        id=1,
        code="super_admin",
        name="超级管理员",
        description="系统最高权限，拥有全部菜单与操作。",
        menu_ids=_all_menu_ids(),
    ),
    SeedRole(
        id=2,
        code="system_admin",
        name="系统管理员",
        description="负责用户、角色、菜单等系统管理。",
        menu_ids=_subtree_menu_ids(1),
    ),
    SeedRole(
        id=3,
        code="content_ops",
        name="内容运营",
        description="负责内容创作、评分优化、关键词命中等内容生产。",
        menu_ids=_subtree_menu_ids(2),
    ),
    SeedRole(
        id=4,
        code="content_viewer",
        name="内容访客",
        description="仅可查看内容库与关键词命中记录（只读）。",
        menu_ids=[2, 12, 220, 222, 13, 231, 233],
    ),
]


# ---- 内置 / 演示用户 ----
USERS: list[SeedUser] = [
    SeedUser(
        id=1,
        username="admin",
        password="admin123456",
        nickname="超级管理员",
        email="admin@example.com",
        phone="13800000000",
        is_superuser=True,
        role_ids=[1],
    ),
    SeedUser(
        id=2,
        username="sysadmin",
        password=DEFAULT_PASSWORD,
        nickname="系统管理员",
        email="sysadmin@example.com",
        phone="13800000001",
        role_ids=[2],
    ),
    SeedUser(
        id=3,
        username="content_lead",
        password=DEFAULT_PASSWORD,
        nickname="内容负责人",
        email="content.lead@example.com",
        phone="13800000002",
        role_ids=[3],
    ),
    SeedUser(
        id=4,
        username="editor01",
        password=DEFAULT_PASSWORD,
        nickname="内容编辑一",
        email="editor01@example.com",
        phone="13800000003",
        role_ids=[3],
    ),
    SeedUser(
        id=5,
        username="editor02",
        password=DEFAULT_PASSWORD,
        nickname="内容编辑二",
        email="editor02@example.com",
        phone="13800000004",
        role_ids=[3],
    ),
    SeedUser(
        id=6,
        username="viewer01",
        password=DEFAULT_PASSWORD,
        nickname="内容访客一",
        email="viewer01@example.com",
        phone="13800000005",
        role_ids=[4],
    ),
    SeedUser(
        id=7,
        username="viewer02",
        password=DEFAULT_PASSWORD,
        nickname="内容访客二",
        email="viewer02@example.com",
        phone="13800000006",
        role_ids=[4],
    ),
    SeedUser(
        id=8,
        username="disabled_user",
        password=DEFAULT_PASSWORD,
        nickname="停用示例账户",
        email="disabled@example.com",
        phone="13800000007",
        is_active=False,
        role_ids=[4],
    ),
]


__all__ = ["DEFAULT_PASSWORD", "ROLES", "USERS", "SeedRole", "SeedUser"]
