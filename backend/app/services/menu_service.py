"""菜单服务：CRUD + ancestors 维护 + 建树。

ancestors 规则（不含自身，带尾分隔符防 LIKE 误匹配）：
- 根节点 parent_id=0，ancestors="0"（虚拟根 0）。
- 子节点 ancestors = 父.ancestors + "," + 父.id（二级为 "0,<root_id>"）。
- 移动节点：重算自身 ancestors，并批量替换所有子孙前缀；禁止移动到自身子树内（防环）。
建树复用 app.core.hierarchy.build_forest（O(n) 内存建树，查库一次）。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.hierarchy import build_forest, forest_to_dict, prune
from app.core.security import invalidate_menus
from app.models.rbac import Menu, MenuType
from app.repositories.menu_repo import MenuRepository
from app.schemas.menu import MenuCreate, MenuOut, MenuTreeNode, MenuUpdate


class MenuService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.menus = MenuRepository(session)

    @staticmethod
    def _to_out(menu: Menu) -> MenuOut:
        return MenuOut.model_validate(menu)

    @staticmethod
    def _child_ancestors(parent: Menu | None) -> str:
        """计算以 parent 为父的子节点 ancestors。"""
        if parent is None:
            # 挂到虚拟根 0
            return "0"
        return f"{parent.ancestors},{parent.id}" if parent.ancestors else str(parent.id)

    async def _get_or_404(self, menu_id: int) -> Menu:
        menu = await self.menus.get(menu_id)
        if menu is None:
            raise NotFoundException("菜单不存在")
        return menu

    async def _resolve_parent(self, parent_id: int) -> Menu | None:
        """校验并返回父节点；parent_id=0 表示挂到虚拟根。"""
        if parent_id == 0:
            return None
        parent = await self.menus.get(parent_id)
        if parent is None:
            raise ValidationException("父菜单不存在")
        return parent

    async def create(self, data: MenuCreate) -> MenuOut:
        parent = await self._resolve_parent(data.parent_id)
        if data.type == MenuType.BUTTON and not data.perm_code:
            raise ValidationException("按钮节点必须指定 perm_code")

        menu = Menu(
            name=data.name,
            type=int(data.type),
            parent_id=data.parent_id,
            ancestors=self._child_ancestors(parent),
            path=data.path,
            icon=data.icon,
            perm_code=data.perm_code,
            order_no=data.order_no,
            visible=data.visible,
        )
        await self.menus.create(menu)
        return self._to_out(menu)

    async def update(self, menu_id: int, data: MenuUpdate) -> MenuOut:
        menu = await self._get_or_404(menu_id)
        payload = data.model_dump(exclude_unset=True)

        # 若变更父节点，需重算 ancestors 并同步子孙
        if "parent_id" in payload and payload["parent_id"] != menu.parent_id:
            await self._move(menu, int(payload.pop("parent_id")))

        perm_changed = "perm_code" in payload and payload["perm_code"] != menu.perm_code
        for field, value in payload.items():
            setattr(menu, field, int(value) if field == "type" and value is not None else value)
        await self.session.flush()
        # 仅按钮 perm_code 变更才影响权限码集合，精确失效相关角色缓存
        if perm_changed:
            await invalidate_menus(self.session, [menu.id])
        return self._to_out(menu)

    async def _move(self, menu: Menu, new_parent_id: int) -> None:
        """将 menu 迁移到新父节点下，重算自身与全部子孙的 ancestors。"""
        if new_parent_id == menu.id:
            raise ValidationException("不能将菜单移动到自身")

        new_parent = await self._resolve_parent(new_parent_id)
        old_self_path = f"{menu.ancestors},{menu.id}" if menu.ancestors else str(menu.id)

        # 防环：新父不能是自身或自身的子孙
        if new_parent is not None:
            new_parent_path = (
                f"{new_parent.ancestors},{new_parent.id}"
                if new_parent.ancestors
                else str(new_parent.id)
            )
            if (
                new_parent.id == menu.id
                or new_parent_path.startswith(f"{old_self_path},")
                or new_parent_path == old_self_path
            ):
                raise ValidationException("不能将菜单移动到其子孙节点下")

        # 先取子孙（基于旧路径），再改自身
        descendants = await self.menus.list_subtree(menu)
        new_ancestors = self._child_ancestors(new_parent)

        menu.parent_id = new_parent_id
        menu.ancestors = new_ancestors
        new_self_path = f"{new_ancestors},{menu.id}" if new_ancestors else str(menu.id)

        # 批量替换子孙前缀：旧 old_self_path → 新 new_self_path
        for node in descendants:
            if node.id == menu.id:
                continue
            node.ancestors = new_self_path + node.ancestors[len(old_self_path) :]
        await self.session.flush()

    async def delete(self, menu_id: int) -> None:
        menu = await self._get_or_404(menu_id)
        if await self.menus.has_children(menu_id):
            raise ConflictException("存在子菜单，无法删除")
        # 删除后 role_menu 关联随级联消失，须在删除前失效受影响角色缓存
        is_button = menu.type == int(MenuType.BUTTON) and menu.perm_code is not None
        if is_button:
            await invalidate_menus(self.session, [menu_id])
        await self.menus.delete(menu)

    async def get(self, menu_id: int) -> MenuOut:
        return self._to_out(await self._get_or_404(menu_id))

    @staticmethod
    def _expand_allowed_menu_ids(rows: list[Menu], allowed: set[int]) -> set[int]:
        """补全被授权菜单的祖先目录，保证导航树不会断链。"""
        expanded = set(allowed)
        for row in rows:
            if row.id not in allowed:
                continue
            for raw in row.ancestors.split(","):
                if raw and raw != "0":
                    expanded.add(int(raw))
        return expanded

    async def _build_tree(
        self,
        *,
        include_button: bool,
        allowed_menu_ids: set[int] | None = None,
    ) -> list[MenuTreeNode]:
        rows = await self.menus.list_ordered()  # 查库一次
        if allowed_menu_ids is not None:
            expanded = self._expand_allowed_menu_ids(rows, allowed_menu_ids)
            rows = [row for row in rows if row.id in expanded]
        forest = build_forest(
            rows,
            id_of=lambda m: m.id,
            parent_id_of=lambda m: m.parent_id,
            root_parent_id=0,
            sort_key=lambda m: (m.order_no, m.id),
        )
        if not include_button:
            forest = prune(forest, keep=lambda m: m.type != int(MenuType.BUTTON))
        nodes = forest_to_dict(
            forest,
            lambda m: self._to_out(m).model_dump(),
        )
        return [MenuTreeNode.model_validate(node) for node in nodes]

    async def nav_tree(
        self,
        *,
        role_ids: tuple[int, ...],
        is_superuser: bool,
    ) -> list[MenuTreeNode]:
        """左侧导航树：按当前用户角色过滤，并剔除按钮节点。"""
        allowed = None
        if not is_superuser:
            allowed = await self.menus.menu_ids_of_roles(role_ids)
        return await self._build_tree(include_button=False, allowed_menu_ids=allowed)

    async def full_tree(self) -> list[MenuTreeNode]:
        """授权树：包含目录/菜单/按钮全量。"""
        return await self._build_tree(include_button=True)
