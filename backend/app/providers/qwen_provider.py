"""Qwen 大模型 Provider（LLMProvider 实现）。

封装内容生成、AI 优化、GEO 评分三类大模型调用（OpenAI 兼容接口）。
- 生成 / 优化使用可配置温度；评分固定低温度保证可复现（见 M3 / Q7）。
- 事实正确性本期不校验（同 M2 取舍）。
- 继承 HttpProvider 复用 httpx.AsyncClient 与 Trace ID 注入。
"""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings
from app.core.exceptions import LLMException, ProviderException
from app.providers.http_provider import HttpProvider
from app.providers.types import LLMResult, ScoreDimension, ScoreResult

_CHAT_PATH = "/chat/completions"


class QwenProvider(HttpProvider):
    """基于 Qwen（OpenAI 兼容模式）的大模型实现。"""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float,
        generate_temperature: float,
        score_temperature: float,
    ) -> None:
        super().__init__(
            base_url=base_url,
            timeout=timeout,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        self._model = model
        self._generate_temperature = generate_temperature
        self._score_temperature = score_temperature

    async def _chat(self, prompt: str, temperature: float) -> str:
        """调用对话补全，返回助手文本内容。"""
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        try:
            data = await self.request_json("POST", _CHAT_PATH, json=payload)
            return str(data["choices"][0]["message"]["content"])
        except ProviderException as exc:
            raise LLMException(str(exc)) from exc
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMException(f"大模型响应结构异常：{exc}") from exc

    async def generate(self, prompt: str) -> LLMResult:
        """按提示词生成正文（markdown）。"""
        body = await self._chat(prompt, self._generate_temperature)
        return LLMResult(body=body, word_count=len(body))

    async def optimize(self, prompt: str) -> LLMResult:
        """按提示词优化并返回替换后的正文。"""
        body = await self._chat(prompt, self._generate_temperature)
        return LLMResult(body=body, word_count=len(body))

    async def score(self, prompt: str) -> ScoreResult:
        """以审判官角色打分，固定低温度保证可复现。"""
        raw = await self._chat(prompt, self._score_temperature)
        try:
            parsed = json.loads(raw)
            dimensions = [
                ScoreDimension(
                    name=str(d["name"]),
                    score=float(d["score"]),
                    weight=float(d["weight"]),
                    detail=str(d.get("detail", "")),
                )
                for d in parsed["dimensions"]
            ]
            return ScoreResult(
                overall_score=float(parsed["overallScore"]),
                grade=str(parsed.get("grade", "")),
                dimensions=dimensions,
            )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise LLMException(f"评分结果解析失败：{exc}") from exc


class MockLLMProvider:
    """内存 Mock 大模型实现，用于本地或测试环境。"""

    async def generate(self, prompt: str) -> LLMResult:
        body = "# Mock 标题\n\n这是 Mock 生成的正文。"
        return LLMResult(
            body=body,
            title_options=["Mock 标题 A", "Mock 标题 B", "Mock 标题 C"],
            word_count=len(body),
        )

    async def optimize(self, prompt: str) -> LLMResult:
        body = "# Mock 优化标题\n\n这是 Mock 优化后的正文。"
        return LLMResult(body=body, word_count=len(body))

    async def score(self, prompt: str) -> ScoreResult:
        names = ["结构化", "信息密度", "可引用性", "语义覆盖", "权威", "可读性", "AI友好"]
        dims = [
            ScoreDimension(name=n, score=85.0, weight=round(1 / len(names), 4), detail="Mock 评语")
            for n in names
        ]
        return ScoreResult(overall_score=85.0, grade="良好", dimensions=dims)

    async def aclose(self) -> None:
        return None


def build_llm_provider() -> QwenProvider | MockLLMProvider:
    """根据配置构建大模型 Provider（运行时切换）。"""
    if settings.llm_backend == "qwen":
        return QwenProvider(
            base_url=settings.qwen_base_url,
            api_key=settings.qwen_api_key,
            model=settings.qwen_model,
            timeout=settings.qwen_timeout_seconds,
            generate_temperature=settings.qwen_generate_temperature,
            score_temperature=settings.qwen_score_temperature,
        )
    return MockLLMProvider()
