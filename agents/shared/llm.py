"""
CAISOGAMES V2 - LLM Service
Direct Gemini API client with zero dependencies.
"""

import json
import os
import urllib.request
import urllib.error
import ssl
from typing import Optional, Dict, Any
from pathlib import Path

from .constants import (
    GEMINI_TEXT_ENDPOINT,
    GEMINI_PRO_MODEL,
    GEMINI_FLASH_MODEL,
    DEFAULT_TEMPERATURE,
    DEFAULT_MAX_TOKENS,
)


def load_env():
    """Load environment variables from .env file."""
    env_path = Path(__file__).parent.parent.parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()


class LLMService:
    """Direct Gemini API client."""

    def __init__(
        self,
        model: str = GEMINI_PRO_MODEL,
        temperature: float = DEFAULT_TEMPERATURE,
        max_output_tokens: int = DEFAULT_MAX_TOKENS,
        proxy_url: Optional[str] = None,
    ):
        load_env()

        self.model = model
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens

        self.api_key = os.getenv('GEMINI_API_KEY')

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables or .env file")

        print(f"✅ Using Gemini API: {model}")

        self.total_tokens = 0
        self.api_calls = 0

    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Generate text response from Gemini API.

        Args:
            prompt: User prompt
            system_instruction: Optional system instruction
            temperature: Override default temperature

        Returns:
            Generated text
        """
        api_url = f"https://generativelanguage.googleapis.com/v1/models/{self.model}:generateContent?key={self.api_key}"

        contents = []
        if system_instruction:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System: {system_instruction}\n\nUser: {prompt}"}]
            })
        else:
            contents.append({
                "role": "user",
                "parts": [{"text": prompt}]
            })

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature or self.temperature,
                "maxOutputTokens": self.max_output_tokens,
            }
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            api_url,
            data=data,
            headers={"Content-Type": "application/json"},
        )

        try:
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(req, timeout=60, context=context) as response:
                result = json.loads(response.read().decode("utf-8"))

                if "candidates" in result and len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        text = candidate["content"]["parts"][0].get("text", "")

                        if "usageMetadata" in result:
                            tokens = result["usageMetadata"].get("totalTokenCount", 0)
                            self.total_tokens += tokens
                        self.api_calls += 1

                        return text
                    else:
                        return f"❌ API Error: No content in response"
                else:
                    return f"❌ API Error: No candidates in response\n{json.dumps(result, indent=2)}"

        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            return f"❌ HTTP Error {e.code}: {e.reason}\nDetails: {error_body}"
        except urllib.error.URLError as e:
            return f"❌ Network Error: {str(e)}"
        except Exception as e:
            return f"❌ Unexpected Error: {str(e)}"

    def get_cost_estimate(self, model: Optional[str] = None) -> float:
        """
        Estimate cost based on tokens used.

        Returns:
            Estimated cost in USD
        """
        model = model or self.model

        if "pro" in model.lower():
            cost_per_1m = 1.25
        else:
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
    """Quick text generation (Flash model)."""
    llm = LLMService(model=GEMINI_FLASH_MODEL)
    return llm.generate(prompt, system_instruction=system)


if __name__ == "__main__":
    llm = LLMService()
    response = llm.generate("Hello, how are you?")
    print(response)
    print("\nStats:", llm.get_stats())
