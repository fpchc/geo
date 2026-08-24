"""内容服务（F-09 生成 / F-13 重新生成上限 / 状态机 / md 预览）。

生成为耗时 LLM 调用，走异步任务框架（core.tasks.task_store）：
- 同步请求段：校验 regen_count < 上限 → 计数 +1 → 置 generating → 提交后台任务；
  达上限则锁定（locked），禁止再生成。
- 后台协程：自建 Session + LLM Provider（脱离请求作用域），组装 prompt → 调模型 →
  成功写版本 + 置 generated；失败置 generate_failed（失败也已计数，符合 F-13）。

状态机见「流程图与状态机.md」。计数与状态转换在同步段原子完成，杜绝并发重复生成。
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.context import get_current_user_ctx
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.tasks.task_store import submit_task
from app.models.content import Content, ContentStatus, ContentVersion, VersionSource
from app.repositories.content_repo import (
    AgentRepository,
    ContentRepository,
    MaterialRepository,
    VersionRepository,
)
from app.schemas.content import (
    ContentDetailOut,
    ContentOut,
    GenerateAccepted,
    GenerateRequest,
    VersionOut,
)
from app.services.content.prompt_builder import build_generate_prompt
from app.services.content.setting_service import SettingService

logger = logging.getLogger(__name__)

_TASK_TYPE = "content_generate"


class ContentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.contents = ContentRepository(session)
        self.versions = VersionRepository(session)
        self.agents = AgentRepository(session)
        self.materials = MaterialRepository(session)
        self.settings_svc = SettingService(session)

    @staticmethod
    def _current_user_id() -> int:
        user = get_current_user_ctx()
        if user is None:
            raise ValidationException("缺少当前用户上下文")
        return user.user_id

    @staticmethod
    def _to_out(content: Content) -> ContentOut:
        return ContentOut(
            id=content.id,
            agent_id=content.agent_id,
            user_id=content.user_id,
            status=content.status,
            regen_count=content.regen_count,
            current_version_id=content.current_version_id,
            params=content.params,
        )

    async def _get_or_404(self, content_id: int) -> Content:
        content = await self.contents.get(content_id)
        if content is None:
            raise NotFoundException("内容不存在")
        return content

    async def _assemble_prompt(self, req: GenerateRequest) -> str:
        """在请求段收集组装 prompt 所需的全部输入（供后台捕获，避免二次查库）。"""
        agent = await self.agents.get(req.agent_id)
        if agent is None or not agent.enabled:
            raise NotFoundException("智能体不存在或未启用")

        default_prompt = await self.settings_svc.get_default_prompt()
        materials = await self.materials.list_by_ids(req.material_ids)
        material_texts = [m.content_text for m in materials]

        return build_generate_prompt(
            agent_prompt=agent.prompt_template or "",
            params=req.params.model_dump(),
            keywords=req.keywords,
            target_word_count=req.target_word_count,
            extra_prompt=req.extra_prompt,
            default_prompt=default_prompt,
            materials=material_texts,
        )

    async def generate(self, req: GenerateRequest, content_id: int | None) -> GenerateAccepted:
        """提交生成/重新生成任务（F-09 / F-13）。"""
        if content_id is None:
            content = Content(
                agent_id=req.agent_id,
                user_id=self._current_user_id(),
                status=ContentStatus.CONFIGURING,
                regen_count=0,
                params=req.params.model_dump(),
            )
            await self.contents.create(content)
        else:
            content = await self._get_or_404(content_id)

        # F-13：达上限锁定，禁止再生成
        if content.regen_count >= settings.content_regen_limit:
            content.status = ContentStatus.LOCKED
            await self.session.flush()
            raise ConflictException(
                f"重新生成已达上限（{settings.content_regen_limit} 次），内容已锁定"
            )

        prompt = await self._assemble_prompt(req)

        # 计数 +1（失败也计入）+ 置 generating + 快照参数
        content.regen_count += 1
        content.status = ContentStatus.GENERATING
        content.params = {
            **req.params.model_dump(),
            "keywords": req.keywords,
            "target_word_count": req.target_word_count,
            "extra_prompt": req.extra_prompt,
            "material_ids": req.material_ids,
        }
        await self.session.flush()

        cid = content.id
        source = VersionSource.GENERATE

        async def runner() -> dict[str, Any]:
            return await _run_generation(cid, prompt, source)

        task_id = await submit_task(_TASK_TYPE, runner)
        return GenerateAccepted(
            content_id=cid,
            task_id=task_id,
            status=ContentStatus.GENERATING,
            regen_count=content.regen_count,
        )

    async def get_detail(self, content_id: int) -> ContentDetailOut:
        """内容详情 + 当前版本正文（md 预览 F-10）。"""
        content = await self._get_or_404(content_id)
        current_version: VersionOut | None = None
        if content.current_version_id is not None:
            version = await self.versions.get(content.current_version_id)
            if version is not None:
                current_version = VersionOut.model_validate(version)
        detail = ContentDetailOut(**self._to_out(content).model_dump())
        detail.current_version = current_version
        return detail

    async def list_versions(self, content_id: int) -> list[VersionOut]:
        await self._get_or_404(content_id)
        rows = await self.versions.list_by_content(content_id)
        return [VersionOut.model_validate(v) for v in rows]

    async def retain(self, content_id: int) -> ContentOut:
        """用户确认留存（generated/reviewed/locked → retained）。"""
        content = await self._get_or_404(content_id)
        allowed = {
            ContentStatus.GENERATED,
            ContentStatus.REVIEWED,
            ContentStatus.LOCKED,
        }
        if content.status not in allowed:
            raise ConflictException(f"当前状态 {content.status} 不可确认留存")
        content.status = ContentStatus.RETAINED
        await self.session.flush()
        return self._to_out(content)

    async def paginate(
        self,
        *,
        offset: int,
        limit: int,
        status: str | None,
        agent_id: int | None,
        order_by: Any,
    ) -> tuple[list[ContentOut], int]:
        filters = []
        if status:
            filters.append(Content.status == status)
        if agent_id is not None:
            filters.append(Content.agent_id == agent_id)
        rows, total = await self.contents.paginate(
            offset=offset, limit=limit, filters=filters, order_by=order_by
        )
        return [self._to_out(c) for c in rows], total


async def _run_generation(content_id: int, prompt: str, source: str) -> dict[str, Any]:
    """后台生成执行体：自建 Session + LLM Provider，写版本并更新状态。

    脱离请求依赖作用域，独立事务；失败置 generate_failed（异常向上抛，
    由 task_store 回写 failed 状态）。
    """
    from app.db.session import get_sessionmaker
    from app.providers.qwen_provider import build_llm_provider

    factory = get_sessionmaker()
    provider = build_llm_provider()
    try:
        result = await provider.generate(prompt)
    except Exception:
        # LLM 失败：置 generate_failed 后向上抛（计数已在同步段计入）
        async with factory() as session:
            content = await session.get(Content, content_id)
            if content is not None:
                content.status = ContentStatus.GENERATE_FAILED
                await session.commit()
        await provider.aclose()
        raise
    await provider.aclose()

    title = _extract_title(result.body)
    async with factory() as session:
        version = ContentVersion(
            content_id=content_id,
            body=result.body,
            title=title,
            word_count=result.word_count,
            source_type=source,
        )
        session.add(version)
        await session.flush()

        content = await session.get(Content, content_id)
        if content is not None:
            content.current_version_id = version.id
            content.status = ContentStatus.GENERATED
        await session.commit()
        version_id = version.id

    return {"content_id": content_id, "version_id": version_id, "title": title}


def _extract_title(body: str) -> str:
    """从 markdown 正文提取首个标题作为版本标题，缺省截取首行。"""
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()[:512] or "未命名"
        if stripped:
            return stripped[:512]
    return "未命名"
