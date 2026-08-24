"""智能体种子数据：单一数据源（M1.2）。

7 个固定智能体（据界面确认）。供数据导入与运行时初始化引用。
prompt_template 为各智能体的系统提示词占位，可后续按业务补全。
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SeedAgent:
    id: int
    name: str
    icon: str
    description: str
    prompt_template: str


# 7 个智能体（M1.2 已确认）
AGENTS: list[SeedAgent] = [
    SeedAgent(
        id=1,
        name="方案设计智能体",
        icon="solution",
        description="面向电子方案设计选题的内容生成。",
        prompt_template="你是资深电子方案设计专家，擅长撰写方案设计类技术文章。",
    ),
    SeedAgent(
        id=2,
        name="元器件提参建库智能体",
        icon="database",
        description="面向元器件参数提取与建库主题的内容生成。",
        prompt_template="你是元器件参数专家，擅长梳理元器件参数与选型建库知识。",
    ),
    SeedAgent(
        id=3,
        name="PCB设计智能体",
        icon="layout",
        description="面向 PCB 设计主题的内容生成。",
        prompt_template="你是 PCB 设计专家，擅长撰写 PCB 布局布线与设计规范文章。",
    ),
    SeedAgent(
        id=4,
        name="器件优选智能体",
        icon="filter",
        description="面向器件优选主题的内容生成。",
        prompt_template="你是器件优选专家，擅长从性能与成本维度撰写器件优选内容。",
    ),
    SeedAgent(
        id=5,
        name="器件优购智能体",
        icon="shopping",
        description="面向器件采购优化主题的内容生成。",
        prompt_template="你是器件采购专家，擅长撰写供应链与采购优化类内容。",
    ),
    SeedAgent(
        id=6,
        name="PCB预审报价智能体",
        icon="audit",
        description="面向 PCB 预审与报价主题的内容生成。",
        prompt_template="你是 PCB 制造工程师，擅长撰写 PCB 预审与报价评估内容。",
    ),
    SeedAgent(
        id=7,
        name="PCB工艺审查智能体(DFM)",
        icon="safety",
        description="面向 PCB 可制造性设计审查（DFM）主题的内容生成。",
        prompt_template="你是 DFM 工艺审查专家，擅长撰写 PCB 可制造性设计审查内容。",
    ),
]


__all__ = ["AGENTS", "SeedAgent"]
