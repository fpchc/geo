"""菜单种子与建树逻辑单元测试（无需 DB）。"""

from __future__ import annotations

from scripts.menu_seed import flatten
from scripts.user_seed import ROLES

from app.core.hierarchy import build_forest, forest_to_dict, prune
from app.models.rbac import MenuType


def test_flatten_ancestors_no_self_and_tail_safe() -> None:
    rows = {m.id: m for m in flatten()}
    # 根节点 ancestors="0"
    assert rows[1].ancestors == "0"
    assert rows[1].parent_id == 0
    # 二级 "0,1"
    assert rows[5].ancestors == "0,1"
    # 三级按钮 "0,1,5"
    assert rows[100].ancestors == "0,1,5"
    assert rows[100].type == int(MenuType.BUTTON)
    assert rows[100].perm_code == "system:user:query"


def test_like_prefix_no_false_match() -> None:
    # 子树查询若用 '0,1,5%' 会误匹配 '0,1,50'；带尾分隔符 '0,1,5,' 则不会。
    samples = ["0,1,5", "0,1,50", "0,1,5,9"]
    matched = [s for s in samples if s == "0,1,5" or s.startswith("0,1,5,")]
    assert matched == ["0,1,5", "0,1,5,9"]  # 50 被正确排除


def test_build_tree_and_prune_buttons() -> None:
    rows = flatten()
    forest = build_forest(
        rows,
        id_of=lambda m: m.id,
        parent_id_of=lambda m: m.parent_id,
        root_parent_id=0,
        sort_key=lambda m: (m.order_no, m.id),
    )
    full = forest_to_dict(forest, lambda m: {"id": m.id, "type": m.type})
    assert any(node["id"] == 8 for node in full)
    # 用户管理下应有 6 个按钮子节点
    system_root = next(node for node in full if node["id"] == 1)
    user_menu = next(c for c in system_root["children"] if c["id"] == 5)
    assert len(user_menu["children"]) == 6

    # 导航树剔除按钮：用户管理下 children 变空
    nav_forest = prune(forest, keep=lambda m: m.type != int(MenuType.BUTTON))
    nav = forest_to_dict(nav_forest, lambda m: {"id": m.id})
    nav_system = next(node for node in nav if node["id"] == 1)
    nav_user = next(c for c in nav_system["children"] if c["id"] == 5)
    assert nav_user["children"] == []


def test_seed_paths_match_frontend_routes() -> None:
    rows = {m.id: m for m in flatten()}
    assert rows[8].path == "/dashboard"
    assert rows[5].path == "/system/users"
    assert rows[6].path == "/system/roles"
    assert rows[7].path == "/system/menus"
    assert rows[12].path == "/content/library"
    assert rows[13].path == "/content/settings"


def test_nav_filter_keeps_ancestor_directories() -> None:
    from app.services.menu_service import MenuService

    expanded = MenuService._expand_allowed_menu_ids(flatten(), {12})
    assert {2, 12}.issubset(expanded)


def test_dashboard_menu_is_granted_to_all_roles_and_viewer_is_read_only() -> None:
    for role in ROLES:
        assert 8 in role.menu_ids
        assert 800 in role.menu_ids

    viewer = next(role for role in ROLES if role.code == "content_viewer")
    assert viewer.menu_ids == [2, 8, 12, 210, 212, 800]


def test_nav_tree_filters_by_roles_and_keeps_parent() -> None:
    import asyncio
    from dataclasses import asdict
    from types import SimpleNamespace

    from app.services.menu_service import MenuService

    class FakeMenuRepository:
        async def list_ordered(self) -> list[SimpleNamespace]:
            return [SimpleNamespace(**asdict(row), visible=True) for row in flatten()]

        async def menu_ids_of_roles(self, role_ids: tuple[int, ...]) -> set[int]:
            return {12} if role_ids else set()

    service = object.__new__(MenuService)
    service.menus = FakeMenuRepository()  # type: ignore[assignment]

    tree = asyncio.run(service.nav_tree(role_ids=(4,), is_superuser=False))

    assert [node.id for node in tree] == [2]
    assert [child.id for child in tree[0].children] == [12]
