"""菜单种子与建树逻辑单元测试（无需 DB）。"""

from __future__ import annotations

from scripts.menu_seed import flatten

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
    assert full[0]["id"] == 1
    # 用户管理下应有 6 个按钮子节点
    user_menu = next(c for c in full[0]["children"] if c["id"] == 5)
    assert len(user_menu["children"]) == 6

    # 导航树剔除按钮：用户管理下 children 变空
    nav_forest = prune(forest, keep=lambda m: m.type != int(MenuType.BUTTON))
    nav = forest_to_dict(nav_forest, lambda m: {"id": m.id})
    nav_user = next(c for c in nav[0]["children"] if c["id"] == 5)
    assert nav_user["children"] == []
