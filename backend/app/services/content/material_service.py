"""资料服务（F-07）：格式/大小校验 + 全文解析 + 对象存储落盘。

- 白名单：settings.material_allowed_extensions（txt/md 直读，pdf/docx 解析）。
- 大小：先按 material_max_bytes 拦截原始字节，解析后再按 material_max_chars 拦截正文。
- pdf/docx 解析为同步库，按 CLAUDE.md §3 用 anyio.to_thread 包装避免阻塞事件循环。
"""

from __future__ import annotations

import io
import uuid

import anyio
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.context import get_current_user_ctx
from app.core.exceptions import ValidationException
from app.core.providers import StorageProvider
from app.models.content import Material
from app.repositories.content_repo import MaterialRepository
from app.schemas.content import MaterialOut


def _allowed_extensions() -> set[str]:
    return {ext.strip().lower() for ext in settings.material_allowed_extensions.split(",") if ext}


def _extract_text_sync(file_type: str, data: bytes) -> str:
    """同步解析文本（供 anyio.to_thread 调用）。"""
    if file_type in ("txt", "md"):
        return data.decode("utf-8", errors="replace")
    if file_type == "pdf":
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if file_type == "docx":
        from docx import Document

        document = Document(io.BytesIO(data))
        return "\n".join(p.text for p in document.paragraphs)
    raise ValidationException(f"不支持的资料格式：{file_type}")


class MaterialService:
    def __init__(self, session: AsyncSession, storage: StorageProvider) -> None:
        self.session = session
        self.storage = storage
        self.materials = MaterialRepository(session)

    @staticmethod
    def _current_user_id() -> int:
        user = get_current_user_ctx()
        if user is None:
            raise ValidationException("缺少当前用户上下文")
        return user.user_id

    @staticmethod
    def _resolve_file_type(filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in _allowed_extensions():
            allowed = ", ".join(sorted(_allowed_extensions()))
            raise ValidationException(f"不支持的文件格式：.{ext}，仅允许 {allowed}")
        return ext

    async def upload(self, filename: str, data: bytes) -> MaterialOut:
        """校验 → 解析 → 落盘 → 落库。"""
        file_type = self._resolve_file_type(filename)

        if len(data) > settings.material_max_bytes:
            raise ValidationException(
                f"文件过大：{len(data)} 字节，上限 {settings.material_max_bytes} 字节"
            )

        text = await anyio.to_thread.run_sync(_extract_text_sync, file_type, data)
        if len(text) > settings.material_max_chars:
            raise ValidationException(
                f"资料正文过长：{len(text)} 字符，上限 {settings.material_max_chars} 字符"
            )

        object_key = f"materials/{uuid.uuid4().hex}/{filename}"
        await self.storage.upload(object_key, data, "application/octet-stream")

        material = Material(
            user_id=self._current_user_id(),
            filename=filename,
            content_text=text,
            object_key=object_key,
            file_type=file_type,
        )
        await self.materials.create(material)
        return MaterialOut(
            id=material.id,
            user_id=material.user_id,
            filename=material.filename,
            file_type=material.file_type,
            object_key=material.object_key,
            char_count=len(text),
        )
