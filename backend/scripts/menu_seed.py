"""菜单种子数据：单一数据源。

供 gen_menu_sql.py（生成 doc/sql/menu.sql）与 Alembic data migration 共同引用。
用嵌套结构声明整棵菜单树；ancestors 由 flatten() 依据层级自动推导，
无需手写，避免出错。ID 显式指定以保证生成结果稳定、可重复导入。
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.rbac import MenuType


@dataclass
class SeedMenu:
    id: int
    name: str
    type: MenuType
    path: str = ""
    icon: str | None = None
    perm_code: str | None = None
    order_no: int = 0
    children: list[SeedMenu] = field(default_factory=list)


@dataclass
class FlatMenu:
    id: int
    name: str
    type: int
    parent_id: int
    ancestors: str
    path: str
    icon: str | None
    perm_code: str | None
    order_no: int


# 菜单树定义：系统管理 > 用户/角色/菜单管理 + 各自增删改查按钮
MENU_TREE: list[SeedMenu] = [
    SeedMenu(
        id=1,
        name="系统管理",
        type=MenuType.DIRECTORY,
        path="/system",
        icon="setting",
        order_no=1,
        children=[
            SeedMenu(
                id=5,
                name="用户管理",
                type=MenuType.MENU,
                path="/system/user",
                perm_code="system:user:list",
                order_no=1,
                children=[
                    SeedMenu(
                        id=100,
                        name="用户查询",
                        type=MenuType.BUTTON,
                        perm_code="system:user:query",
                        order_no=1,
                    ),
                    SeedMenu(
                        id=101,
                        name="用户新增",
                        type=MenuType.BUTTON,
                        perm_code="system:user:create",
                        order_no=2,
                    ),
                    SeedMenu(
                        id=102,
                        name="用户修改",
                        type=MenuType.BUTTON,
                        perm_code="system:user:update",
                        order_no=3,
                    ),
                    SeedMenu(
                        id=103,
                        name="用户删除",
                        type=MenuType.BUTTON,
                        perm_code="system:user:delete",
                        order_no=4,
                    ),
                    SeedMenu(
                        id=104,
                        name="重置密码",
                        type=MenuType.BUTTON,
                        perm_code="system:user:resetpwd",
                        order_no=5,
                    ),
                    SeedMenu(
                        id=105,
                        name="分配角色",
                        type=MenuType.BUTTON,
                        perm_code="system:user:assign",
                        order_no=6,
                    ),
                ],
            ),
            SeedMenu(
                id=6,
                name="角色管理",
                type=MenuType.MENU,
                path="/system/role",
                perm_code="system:role:list",
                order_no=2,
                children=[
                    SeedMenu(
                        id=110,
                        name="角色查询",
                        type=MenuType.BUTTON,
                        perm_code="system:role:query",
                        order_no=1,
                    ),
                    SeedMenu(
                        id=111,
                        name="角色新增",
                        type=MenuType.BUTTON,
                        perm_code="system:role:create",
                        order_no=2,
                    ),
                    SeedMenu(
                        id=112,
                        name="角色修改",
                        type=MenuType.BUTTON,
                        perm_code="system:role:update",
                        order_no=3,
                    ),
                    SeedMenu(
                        id=113,
                        name="角色删除",
                        type=MenuType.BUTTON,
                        perm_code="system:role:delete",
                        order_no=4,
                    ),
                    SeedMenu(
                        id=114,
                        name="分配权限",
                        type=MenuType.BUTTON,
                        perm_code="system:role:assign",
                        order_no=5,
                    ),
                ],
            ),
            SeedMenu(
                id=7,
                name="菜单管理",
                type=MenuType.MENU,
                path="/system/menu",
                perm_code="system:menu:list",
                order_no=3,
                children=[
                    SeedMenu(
                        id=120,
                        name="菜单查询",
                        type=MenuType.BUTTON,
                        perm_code="system:menu:query",
                        order_no=1,
                    ),
                    SeedMenu(
                        id=121,
                        name="菜单新增",
                        type=MenuType.BUTTON,
                        perm_code="system:menu:create",
                        order_no=2,
                    ),
                    SeedMenu(
                        id=122,
                        name="菜单修改",
                        type=MenuType.BUTTON,
                        perm_code="system:menu:update",
                        order_no=3,
                    ),
                    SeedMenu(
                        id=123,
                        name="菜单删除",
                        type=MenuType.BUTTON,
                        perm_code="system:menu:delete",
                        order_no=4,
                    ),
                ],
            ),
        ],
    ),
    SeedMenu(
        id=2,
        name="内容生产",
        type=MenuType.DIRECTORY,
        path="/content",
        icon="file-text",
        order_no=2,
        children=[
            SeedMenu(
                id=11,
                name="内容创作",
                type=MenuType.MENU,
                path="/content/studio",
                perm_code="content:content:list",
                order_no=1,
                children=[
                    SeedMenu(
                        id=200,
                        name="智能体列表",
                        type=MenuType.BUTTON,
                        perm_code="content:agent:list",
                        order_no=1,
                    ),
                    SeedMenu(
                        id=204,
                        name="智能体查询",
                        type=MenuType.BUTTON,
                        perm_code="content:agent:query",
                        order_no=2,
                    ),
                    SeedMenu(
                        id=201,
                        name="上传资料",
                        type=MenuType.BUTTON,
                        perm_code="content:material:create",
                        order_no=3,
                    ),
                    SeedMenu(
                        id=202,
                        name="AI生成",
                        type=MenuType.BUTTON,
                        perm_code="content:content:generate",
                        order_no=4,
                    ),
                    SeedMenu(
                        id=203,
                        name="关键词评审",
                        type=MenuType.BUTTON,
                        perm_code="content:review:score",
                        order_no=5,
                    ),
                ],
            ),
            SeedMenu(
                id=12,
                name="内容库",
                type=MenuType.MENU,
                path="/content/manage",
                perm_code="content:content:list",
                order_no=2,
                children=[
                    SeedMenu(
                        id=210,
                        name="内容查询",
                        type=MenuType.BUTTON,
                        perm_code="content:content:query",
                        order_no=1,
                    ),
                    SeedMenu(
                        id=211,
                        name="确认留存",
                        type=MenuType.BUTTON,
                        perm_code="content:content:create",
                        order_no=2,
                    ),
                    SeedMenu(
                        id=212,
                        name="评分查询",
                        type=MenuType.BUTTON,
                        perm_code="content:review:query",
                        order_no=3,
                    ),
                ],
            ),
            SeedMenu(
                id=13,
                name="内容配置",
                type=MenuType.MENU,
                path="/content/setting",
                perm_code="content:setting:query",
                order_no=3,
                children=[
                    SeedMenu(
                        id=220,
                        name="配置查询",
                        type=MenuType.BUTTON,
                        perm_code="content:setting:query",
                        order_no=1,
                    ),
                    SeedMenu(
                        id=221,
                        name="配置修改",
                        type=MenuType.BUTTON,
                        perm_code="content:setting:update",
                        order_no=2,
                    ),
                ],
            ),
        ],
    ),
]


def flatten(tree: list[SeedMenu] | None = None) -> list[FlatMenu]:
    """将菜单树展平为带 parent_id / ancestors 的扁平列表。

    ancestors 不含自身、带虚拟根 0；根节点 ancestors="0"。
    """
    nodes = tree if tree is not None else MENU_TREE
    result: list[FlatMenu] = []

    def walk(node: SeedMenu, parent_id: int, parent_ancestors: str) -> None:
        result.append(
            FlatMenu(
                id=node.id,
                name=node.name,
                type=int(node.type),
                parent_id=parent_id,
                ancestors=parent_ancestors,
                path=node.path,
                icon=node.icon,
                perm_code=node.perm_code,
                order_no=node.order_no,
            )
        )
        self_ancestors = f"{parent_ancestors},{node.id}" if parent_ancestors else str(node.id)
        for child in node.children:
            walk(child, node.id, self_ancestors)

    for root in nodes:
        # 顶级节点：parent_id=0，ancestors="0"
        walk(root, 0, "0")
    return result


__all__ = ["MENU_TREE", "FlatMenu", "SeedMenu", "flatten"]
