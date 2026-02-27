"""
CAISOGAMES V2 - LLM Service
Zero-dependency HTTP client using Vercel Proxy for Gemini API.

V2 개선사항:
- Vercel Proxy 아키텍처 (API 키는 Vercel에만 존재)
- 구조화된 에러 처리
- 비용 추적 기능
"""

import json
import os
import urllib.request
import urllib.error
from typing import Optional, Dict, Any
from datetime import datetime

from .constants import (
    GEMINI_TEXT_ENDPOINT,
    GEMINI_PRO_MODEL,
    GEMINI_FLASH_MODEL,
    DEFAULT_TEMPERATURE,
    DEFAULT_MAX_TOKENS,
)


class LLMService:
    """
    Zero-dependency LLM client using Vercel Proxy.

    V2 특징:
    - API 키 불필요 (Vercel이 자동 주입)
    - Mock 모드 지원 (VERCEL_PROXY_URL 없을 때)
    - 비용 추적
    """

    def __init__(
        self,
        model: str = GEMINI_PRO_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        max_output_tokens: int = DEFAULT_MAX_TOKENS,
        proxy_url: Optional[str] = None,
    ):
        self.model = model
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self.proxy_url = proxy_url or GEMINI_TEXT_ENDPOINT

        # Mock mode if no proxy URL
        if not self.proxy_url or "localhost" in self.proxy_url:
            print(f"⚠️  Warning: Using Mock LLM mode (no Vercel proxy)")
            self.mock_mode = True
        else:
            self.mock_mode = False

        # Cost tracking
        self.total_tokens = 0
        self.api_calls = 0

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Generate text response from Gemini via Vercel Proxy.

        Args:
            prompt: User prompt
            system_instruction: Optional system instruction
            temperature: Override default temperature

        Returns:
            Generated text
        """
        if self.mock_mode:
            return self._generate_mock(prompt)

        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "temperature": temperature or self.temperature,
            "max_tokens": self.max_output_tokens,
        }

        if system_instruction:
            payload["system_instruction"] = system_instruction

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.proxy_url,
            data=data,
            headers={"Content-Type": "application/json"},
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))

                if not result.get("success"):
                    error_msg = result.get("error", "Unknown error")
                    return f"❌ API Error: {error_msg}"

                text = result.get("text", "")
                tokens = result.get("tokens_used", 0)

                # Track usage
                self.total_tokens += tokens
                self.api_calls += 1

                return text

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            return f"❌ HTTP Error {e.code}: {e.reason}\nDetails: {error_body}"
        except urllib.error.URLError as e:
            return f"❌ Network Error: {str(e)}\n\n🔍 Check: Is Vercel proxy running? {self.proxy_url}"
        except Exception as e:
            return f"❌ Unexpected Error: {str(e)}"

    def _generate_mock(self, prompt: str) -> str:
        """Mock response for offline development."""
        return f"""Mock LLM Response for Phase 1 Testing

Prompt received: {prompt[:100]}...

This is a placeholder response.
In production, this would call Vercel proxy → Gemini API.

Timestamp: {datetime.now().isoformat()}
"""

    def get_cost_estimate(self, model: Optional[str] = None) -> float:
        """
        Estimate cost based on tokens used.

        Returns:
            Estimated cost in USD
        """
        model = model or self.model

        if "pro" in model.lower():
            cost_per_1m = 1.25
        else:  # flash
            cost_per_1m = 0.075

        return (self.total_tokens / 1_000_000) * cost_per_1m

    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            "api_calls": self.api_calls,
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": self.get_cost_estimate(),
            "model": self.model,
        }


# Convenience functions for common use cases
def generate_text(
    prompt: str,
    model: str = GEMINI_PRO_MODEL,
    system: Optional[str] = None,
) -> str:
    """Quick text generation (Pro model)."""
    llm = LLMService(model=model)
    return llm.generate(prompt, system_instruction=system)


def generate_text_fast(
    prompt: str,
    system: Optional[str] = None,
) -> str:
    """Quick text generation (Flash model - cheaper, faster)."""
    llm = LLMService(model=GEMINI_FLASH_MODEL)
    return llm.generate(prompt, system_instruction=system)


if __name__ == "__main__":
    # Test
    llm = LLMService()
    response = llm.generate("Hello, how are you?")
    print(response)
    print("\nStats:", llm.get_stats())
