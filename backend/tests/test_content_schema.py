"""内容 Schema 只读字段单元测试。"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schemas.content import ContentOut


def test_content_out_exposes_library_fields() -> None:
    now = datetime.now(UTC)
    item = ContentOut(
        id=1,
        title="示例标题",
        created_at=now,
        updated_at=now,
        username="editor01",
        agent_id=2,
        user_id=3,
        status="generated",
        regen_count=1,
        current_version_id=9,
        params={"keywords": ["geo"]},
    )

    assert item.title == "示例标题"
    assert item.username == "editor01"
    assert item.current_version_id == 9
