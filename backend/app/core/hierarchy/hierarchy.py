"""通用层级树结构：与业务模型解耦的泛型建树工具。

对标 C# IHierarchical<out T>：Current / Root / Parent / Ancestors / Descendants / Children。
建树为 O(n) 单遍——调用方须一次性查出扁平列表，禁止在循环内查库。
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterable, Iterator
from typing import Literal, Protocol

type OrphanStrategy = Literal["root", "skip", "error"]


class IHierarchical[T](Protocol):
    """层级节点只读接口。"""

    @property
    def current(self) -> T: ...
    @property
    def root(self) -> IHierarchical[T]: ...
    @property
    def parent(self) -> IHierarchical[T] | None: ...
    @property
    def ancestors(self) -> Iterator[IHierarchical[T]]: ...
    @property
    def descendants(self) -> Iterator[IHierarchical[T]]: ...
    @property
    def children(self) -> tuple[IHierarchical[T], ...]: ...


class HierarchyNode[T]:
    """IHierarchical 的具体实现，包裹任意业务对象 T。"""

    __slots__ = ("_children", "_parent", "_value")

    def __init__(self, value: T) -> None:
        self._value = value
        self._parent: HierarchyNode[T] | None = None
        self._children: list[HierarchyNode[T]] = []

    @property
    def current(self) -> T:
        return self._value

    @property
    def parent(self) -> HierarchyNode[T] | None:
        return self._parent

    @property
    def root(self) -> HierarchyNode[T]:
        node = self
        while node._parent is not None:
            node = node._parent
        return node

    @property
    def ancestors(self) -> Iterator[HierarchyNode[T]]:
        """自底向上：父、祖父……直到根。"""
        node = self._parent
        while node is not None:
            yield node
            node = node._parent

    @property
    def children(self) -> tuple[HierarchyNode[T], ...]:
        return tuple(self._children)

    @property
    def descendants(self) -> Iterator[HierarchyNode[T]]:
        """后代集合，深度优先先序遍历（DFS preorder）。"""
        for child in self._children:
            yield child
            yield from child.descendants

    @property
    def is_root(self) -> bool:
        return self._parent is None

    @property
    def is_leaf(self) -> bool:
        return not self._children

    @property
    def depth(self) -> int:
        """根节点深度为 0。"""
        return sum(1 for _ in self.ancestors)

    def attach(self, child: HierarchyNode[T]) -> None:
        """挂载子节点并回填其父引用。"""
        child._parent = self
        self._children.append(child)


def build_forest[T, K: Hashable](
    items: Iterable[T],
    *,
    id_of: Callable[[T], K],
    parent_id_of: Callable[[T], K],
    root_parent_id: K,
    sort_key: Callable[[T], object] | None = None,
    on_orphan: OrphanStrategy = "root",
) -> list[HierarchyNode[T]]:
    """将扁平列表构建为层级森林（可能有多个根）。

    - items         : 扁平数据（应由调用方一次性查库得到）。
    - id_of         : 取节点主键。
    - parent_id_of  : 取父键。
    - root_parent_id: 根标识（本项目菜单为 0）。
    - sort_key      : 排序键；给定后先排序，使各层 children 有序。
    - on_orphan     : 父缺失时的策略——当作根 / 跳过 / 抛错。

    复杂度 O(n)：一次建映射、一次挂载，全程不查库。
    """
    ordered = list(items)
    if sort_key is not None:
        ordered.sort(key=sort_key)

    node_map: dict[K, HierarchyNode[T]] = {id_of(it): HierarchyNode(it) for it in ordered}
    roots: list[HierarchyNode[T]] = []

    for it in ordered:
        node = node_map[id_of(it)]
        pid = parent_id_of(it)
        if pid == root_parent_id:
            roots.append(node)
            continue
        parent = node_map.get(pid)
        if parent is not None:
            parent.attach(node)
        elif on_orphan == "root":
            roots.append(node)
        elif on_orphan == "error":
            raise ValueError(f"孤儿节点 id={id_of(it)!r} 的父 {pid!r} 不存在")
        # on_orphan == "skip": 丢弃该节点及其子树

    return roots


def prune[T](
    roots: Iterable[HierarchyNode[T]],
    keep: Callable[[T], bool],
) -> list[HierarchyNode[T]]:
    """过滤不满足 keep 的节点（及其整棵子树）。

    用于导航树剔除按钮节点等场景。返回全新节点，不改动入参树。
    """
    result: list[HierarchyNode[T]] = []
    for node in roots:
        if not keep(node.current):
            continue
        kept: HierarchyNode[T] = HierarchyNode(node.current)
        for child in prune(node.children, keep):
            kept.attach(child)
        result.append(kept)
    return result


def to_dict[T](
    node: HierarchyNode[T],
    mapper: Callable[[T], dict[str, object]],
    *,
    children_key: str = "children",
) -> dict[str, object]:
    """递归序列化为嵌套 dict，children 就地拼装。"""
    data = mapper(node.current)
    data[children_key] = [to_dict(c, mapper, children_key=children_key) for c in node.children]
    return data


def forest_to_dict[T](
    roots: Iterable[HierarchyNode[T]],
    mapper: Callable[[T], dict[str, object]],
    *,
    children_key: str = "children",
) -> list[dict[str, object]]:
    """将森林序列化为 dict 列表。"""
    return [to_dict(node, mapper, children_key=children_key) for node in roots]


__all__ = [
    "HierarchyNode",
    "IHierarchical",
    "OrphanStrategy",
    "build_forest",
    "forest_to_dict",
    "prune",
    "to_dict",
]
