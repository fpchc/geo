"""内容生产纯逻辑单测：F-08 Prompt 组装 + F-13 计数上限。"""

from __future__ import annotations

from app.core.config import settings
from app.services.content.prompt_builder import (
    build_generate_prompt,
    build_review_prompt,
)


def test_generate_prompt_follows_fixed_order() -> None:
    """F-08：智能体提示词 → 参数 → 关键词 → 字数 → 额外提示词 → 资料 顺序固定。"""
    prompt = build_generate_prompt(
        agent_prompt="你是方案设计专家。",
        params={"audience": "工程师", "platform": "知乎", "industry": "电子", "angle": "实战"},
        keywords=["PCB", "阻抗匹配"],
        target_word_count=1200,
        extra_prompt="请多用示例。",
        default_prompt="默认提示词",
        materials=["资料正文A", "资料正文B"],
    )
    # 段落顺序断言
    i_agent = prompt.index("你是方案设计专家")
    i_params = prompt.index("目标受众：工程师")
    i_keyword = prompt.index("PCB")
    i_wordcount = prompt.index("1200")
    i_extra = prompt.index("请多用示例")
    i_material = prompt.index("资料正文A")
    assert i_agent < i_params < i_keyword < i_wordcount < i_extra < i_material


def test_generate_prompt_falls_back_to_default_when_no_extra() -> None:
    """F-05：额外提示词为空时套用默认提示词。"""
    prompt = build_generate_prompt(
        agent_prompt="agent",
        params={},
        keywords=[],
        target_word_count=800,
        extra_prompt=None,
        default_prompt="这是默认提示词",
        materials=[],
    )
    assert "这是默认提示词" in prompt


def test_generate_prompt_keyword_rule_present() -> None:
    """F-03：关键词须原样命中 + 自然融入约束句出现。"""
    prompt = build_generate_prompt(
        agent_prompt="agent",
        params={},
        keywords=["关键词甲"],
        target_word_count=800,
        extra_prompt=None,
        default_prompt="d",
        materials=[],
    )
    assert "原样出现" in prompt
    assert "禁止" in prompt
    assert "关键词甲" in prompt


def test_review_prompt_carries_keywords_and_rule() -> None:
    """F-11 / F-12：评审 Prompt 带关键词与后台评分规则维度。"""
    rule = {
        "full_score": 100,
        "dimensions": [{"name": "关键词覆盖率", "weight": 0.5, "detail": "命中占比"}],
    }
    prompt = build_review_prompt(body="# 标题\n正文", keywords=["kw1", "kw2"], scoring_rule=rule)
    assert "kw1" in prompt and "kw2" in prompt
    assert "关键词覆盖率" in prompt
    assert "100" in prompt
    assert "overallScore" in prompt


def test_regen_limit_default_is_ten() -> None:
    """F-13：重新生成上限默认 10 次。"""
    assert settings.content_regen_limit == 10
