"""Prompt 组装（F-08）：按固定顺序拼装最终生成提示词。

顺序（见「流程图与状态机.md · 二」）：
    智能体基础提示词
  + 创作参数映射约束句（受众/平台/行业/角度 → 风格·语气·结构）
  + 关键词列表（原样命中 + 自然融入·禁止堆砌）
  + 目标字数（长度约束）
  + 额外提示词（无则默认提示词·仅后台可改）
  + 上传资料全文（可选）

以及评审 Prompt（F-11）：关键词覆盖审核，按后台评分规则出分。

纯函数模块，不依赖 I/O，便于单测。
"""

from __future__ import annotations

from typing import Any

# 关键词命中口径：生成端「原样写入」与评审端「原样命中率」共用同一约束句（保证一致性）
_KEYWORD_RULE = "以下关键词必须原样出现在正文中，并自然融入语句，禁止生硬堆砌罗列："


def _params_clause(params: dict[str, Any]) -> str:
    """创作参数 → 风格约束句。仅影响文风，不触发投放/平台适配逻辑。"""
    mapping = [
        ("目标受众", params.get("audience")),
        ("发布平台", params.get("platform")),
        ("行业领域", params.get("industry")),
        ("创作角度", params.get("angle")),
    ]
    parts = [f"{label}：{value}" for label, value in mapping if value]
    if not parts:
        return ""
    return "请在不改变事实的前提下，按以下风格/语气/结构约束创作（仅影响文风）：\n" + "；".join(
        parts
    )


def build_generate_prompt(
    *,
    agent_prompt: str,
    params: dict[str, Any],
    keywords: list[str],
    target_word_count: int,
    extra_prompt: str | None,
    default_prompt: str,
    materials: list[str],
) -> str:
    """组装最终生成 Prompt（F-08）。"""
    segments: list[str] = []

    # 1. 智能体基础提示词
    if agent_prompt.strip():
        segments.append(agent_prompt.strip())

    # 2. 创作参数约束句
    params_clause = _params_clause(params)
    if params_clause:
        segments.append(params_clause)

    # 3. 关键词（原样命中 + 自然融入）
    if keywords:
        segments.append(_KEYWORD_RULE + "、".join(keywords))

    # 4. 目标字数
    segments.append(f"目标字数约为 {target_word_count} 字，允许上下浮动。")

    # 5. 额外提示词（无则默认提示词）
    tail_prompt = extra_prompt.strip() if extra_prompt and extra_prompt.strip() else default_prompt
    if tail_prompt.strip():
        segments.append(tail_prompt.strip())

    # 6. 上传资料全文
    for idx, material in enumerate(materials, start=1):
        segments.append(f"【参考资料 {idx}】\n{material}")

    # 7. 输出格式约束（F-09：输出 Markdown）
    segments.append("请以规范的 Markdown 格式输出，包含标题与合理的层级结构。")

    return "\n\n".join(segments)


def build_review_prompt(
    *,
    body: str,
    keywords: list[str],
    scoring_rule: dict[str, Any],
) -> str:
    """组装关键词评审 Prompt（F-11 / F-12）。

    评分规则由后台可配（scoring_rule），本函数据其构造审判官指令，
    要求返回 JSON：{"overallScore", "grade", "dimensions": [...]}。
    """
    dimensions = scoring_rule.get("dimensions", [])
    dims_desc = "\n".join(
        f"- {d.get('name')}（权重 {d.get('weight')}）：{d.get('detail', '')}" for d in dimensions
    )
    full_score = scoring_rule.get("full_score", 100)
    keyword_line = "、".join(keywords) if keywords else "（无）"

    return (
        "你是内容评审官，请对以下 Markdown 内容做关键词覆盖审核并打分。\n"
        f"评审关键词（判定原样命中率）：{keyword_line}\n"
        f"满分：{full_score}\n"
        "评分维度及权重：\n"
        f"{dims_desc}\n\n"
        "命中口径：关键词须原样出现在正文中方计命中，仅计原样命中率；"
        "堆砌罗列应扣分。\n\n"
        "严格返回如下 JSON（不要额外解释）：\n"
        '{"overallScore": <float>, "grade": "<等级>", '
        '"dimensions": [{"name": "<维度>", "score": <float>, '
        '"weight": <float>, "detail": "<评语>"}]}\n\n'
        "待评审内容：\n"
        f"{body}"
    )
