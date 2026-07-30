"""
Enterprise LLM Service for DecisionOS using Groq (Llama 3.3 70B Versatile).
Provides real-time SQL synthesis, C-Suite narrative generation, and fallback resilience.
"""
import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import settings

logger = logging.getLogger("decisionos.llm")


class LLMService:
    """
    High-speed LLM integration using Groq LPUs with local deterministic fallback.
    """

    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_NAME = "llama-3.3-70b-versatile"

    @classmethod
    async def call_groq(cls, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> Optional[str]:
        """
        Execute an async call to Groq Llama 3.3 70B.
        Returns the generated content text or None on failure.
        """
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return None

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(
                    cls.GROQ_API_URL,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": cls.MODEL_NAME,
                        "temperature": temperature,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"].strip()
                else:
                    logger.warning(f"Groq API error {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            logger.warning(f"Groq connection error: {e}")
            return None

    @classmethod
    async def generate_nlq_answer(
        cls, question: str, sql_query: str, columns: List[str], sample_results: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Synthesize a C-Suite natural language executive summary from NLQ query results.
        """
        system_prompt = (
            "You are an AI Executive Decision Analyst for a C-Suite dashboard. "
            "Explain analytical query results clearly and concisely in 2 sentences. "
            "Highlight key numbers, trends, or outliers in professional business tone."
        )
        user_prompt = (
            f"User Question: '{question}'\n"
            f"Executed SQL Query: {sql_query}\n"
            f"Columns: {columns}\n"
            f"Result Rows (first 5): {sample_results[:5]}\n\n"
            "Provide a crisp 2-sentence executive answer summarizing these numbers."
        )
        return await cls.call_groq(system_prompt, user_prompt, temperature=0.3)

    @classmethod
    async def generate_executive_commentary(cls, dataset_name: str, metrics_summary: Dict[str, Any]) -> Optional[str]:
        """
        Generate deep C-Suite Markdown memorandum commentary for Executive Briefings.
        """
        system_prompt = (
            "You are the Chief Decision Scientist synthesizing an Executive Briefing Memo. "
            "Use clear Markdown formatting with bold metrics and actionable C-Suite bullet points."
        )
        user_prompt = (
            f"Dataset Name: {dataset_name}\n"
            f"Summary Metrics: {json.dumps(metrics_summary, indent=2)}\n\n"
            "Write a 3-paragraph executive memorandum analyzing organizational health, "
            "growth risks, and prescriptive 80/20 recommendations."
        )
        return await cls.call_groq(system_prompt, user_prompt, temperature=0.4)

    @classmethod
    async def answer_briefing_qna(
        cls, question: str, dataset_name: str, context_text: str
    ) -> Optional[str]:
        """
        Answer arbitrary executive questions in the C-Suite Briefing Q&A Assistant.
        """
        system_prompt = (
            "You are a C-Suite Executive Co-Pilot answering board-level questions "
            "using empirical dataset evidence."
        )
        user_prompt = (
            f"Dataset: {dataset_name}\n"
            f"Context & Metrics:\n{context_text}\n\n"
            f"Board Member Question: '{question}'\n\n"
            "Provide an articulate, evidence-based answer in 2 to 3 sentences."
        )
        return await cls.call_groq(system_prompt, user_prompt, temperature=0.2)
