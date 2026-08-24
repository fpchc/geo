"""Provider 抽象基类。

统一约定：所有底层调用（大模型 / 对象存储 / 爬虫等）都封装为 Provider，
经 core.providers 注册中心注入 service。每个 Provider 只需保证可释放底层连接。

具体的业务方法契约由各自的 Protocol（见 provider_registry）静态约束，
本基类只强制 aclose()，避免像旧版那样把某个具体方法（fetch_resource）
硬编码进基类，导致不同种类 Provider 无法共用。
"""

from __future__ import annotations

import abc


class BaseProvider(abc.ABC):
    """底层调用提供者抽象基类。"""

    @abc.abstractmethod
    async def aclose(self) -> None:
        """释放底层连接资源。"""
        raise NotImplementedError
