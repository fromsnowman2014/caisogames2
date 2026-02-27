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

        # Mock mode if no proxy URL or localhost
        # Force mock mode for Phase 1 testing
        self.mock_mode = True  # TODO: Set to False when Vercel proxy is ready
        if self.mock_mode:
            print(f"⚠️  Warning: Using Mock LLM mode (Phase 1 testing)")

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

        # Detect the type of request based on prompt keywords
        if "DESIGN A COMPELLING GAME CONCEPT" in prompt:
            # Concept Designer mock
            return '''```json
{
  "concept": {
    "title": "Cyber Cat: Neon Memories",
    "genre": "platformer",
    "tagline": "A robot cat's quest through a neon cyberpunk city to recover lost memories",
    "coreLoop": ["Explore", "Wall-Jump & Dash", "Collect Memory Chips", "Avoid Drones", "Reach Checkpoint"],
    "playerAbilities": [
      {
        "id": "jump",
        "name": "Jump",
        "description": "Basic jump ability",
        "unlockCondition": null
      },
      {
        "id": "wall_jump",
        "name": "Wall Jump",
        "description": "Jump off walls to reach higher platforms",
        "unlockCondition": null
      },
      {
        "id": "dash",
        "name": "Dash",
        "description": "Quick horizontal dash through obstacles",
        "unlockCondition": "Collect 10 memory chips"
      }
    ],
    "progressionSystem": {
      "type": "linear",
      "unlockMechanism": "level_completion"
    },
    "mechanics": {
      "primary": ["wall_jump", "dash", "platforming"],
      "secondary": ["collectibles", "enemy_avoidance"],
      "unique": ["memory_chip_collection_unlocks_abilities", "neon_visual_trails"]
    },
    "difficultyCurve": {
      "type": "gradual",
      "description": "Starts with basic platforming, introduces wall-jumping in level 1, dash in level 2"
    },
    "winCondition": "Collect all memory chips and reach the central server",
    "loseCondition": "Hit by drones (respawn at checkpoint)",
    "estimatedPlaytime": 25
  },
  "designRationale": "Combines classic platforming with cyberpunk aesthetics. Wall-jumping and dashing create skill-based gameplay. Memory chips as collectibles tie into narrative and progression.",
  "referenceGames": ["Celeste", "Katana ZERO", "Cyber Shadow"]
}
```'''

        elif "DESIGN" in prompt and "LEVELS" in prompt:
            # Level Designer mock
            return '''```json
{
  "levels": [
    {
      "id": "level_1",
      "name": "Neon Alleys",
      "difficulty": 2,
      "theme": "cyberpunk_city",
      "layout": {
        "width": 3000,
        "height": 800,
        "platforms": [
          {"x": 0, "y": 700, "width": 300, "height": 32, "type": "ground"},
          {"x": 400, "y": 600, "width": 200, "height": 32, "type": "floating"},
          {"x": 700, "y": 500, "width": 150, "height": 32, "type": "floating"}
        ],
        "enemies": [
          {"x": 500, "y": 550, "type": "drone", "behavior": "patrol", "patrolRange": 200}
        ],
        "collectibles": [
          {"x": 450, "y": 550, "type": "memory_chip", "value": 1, "required": false}
        ],
        "goal": {"x": 2800, "y": 700}
      },
      "mechanics": {
        "introduced": ["wall_jump"],
        "required": ["basic_jump", "wall_jump"]
      },
      "estimatedCompletionTime": "3-4 minutes",
      "skillRequirements": ["basic_jump", "wall_jump", "timing"]
    },
    {
      "id": "level_2",
      "name": "Rooftop Chase",
      "difficulty": 4,
      "theme": "rooftops",
      "layout": {
        "width": 3500,
        "height": 900,
        "platforms": [
          {"x": 0, "y": 800, "width": 250, "height": 32, "type": "ground"},
          {"x": 350, "y": 700, "width": 180, "height": 32, "type": "floating"}
        ],
        "enemies": [
          {"x": 600, "y": 650, "type": "drone", "behavior": "chase", "patrolRange": 300}
        ],
        "collectibles": [
          {"x": 400, "y": 650, "type": "memory_chip", "value": 1, "required": false}
        ],
        "goal": {"x": 3300, "y": 800}
      },
      "mechanics": {
        "introduced": ["dash"],
        "required": ["wall_jump", "dash", "precision_timing"]
      },
      "estimatedCompletionTime": "4-5 minutes",
      "skillRequirements": ["wall_jump", "dash", "enemy_avoidance"]
    },
    {
      "id": "level_3",
      "name": "Central Server",
      "difficulty": 7,
      "theme": "tech_core",
      "layout": {
        "width": 4000,
        "height": 1000,
        "platforms": [
          {"x": 0, "y": 900, "width": 200, "height": 32, "type": "ground"}
        ],
        "enemies": [
          {"x": 800, "y": 700, "type": "drone", "behavior": "patrol", "patrolRange": 150},
          {"x": 1500, "y": 600, "type": "drone", "behavior": "chase", "patrolRange": 250}
        ],
        "collectibles": [
          {"x": 900, "y": 650, "type": "memory_chip", "value": 1, "required": true}
        ],
        "goal": {"x": 3800, "y": 900}
      },
      "mechanics": {
        "introduced": [],
        "required": ["wall_jump", "dash", "precise_platforming", "enemy_timing"]
      },
      "estimatedCompletionTime": "6-8 minutes",
      "skillRequirements": ["mastery_of_all_mechanics"]
    }
  ],
  "difficultyProgression": {
    "curve": "gradual",
    "description": "Level 1 introduces wall-jumping in safe environment. Level 2 adds dash and more enemies. Level 3 combines all mechanics with precise challenges."
  },
  "totalEstimatedPlaytime": 20
}
```'''

        elif "DESIGN A COMPELLING GAME NARRATIVE" in prompt:
            # Narrative Designer mock
            return '''```json
{
  "worldSetting": {
    "name": "Neo-Tokyo 2099",
    "description": "A sprawling neon-lit cyberpunk metropolis where AI and humans coexist",
    "lore": "After the Great Data Purge of 2095, many AI entities lost their core memories. You are a prototype rescue bot designed to recover these lost data fragments scattered across the city."
  },
  "characters": {
    "protagonist": {
      "name": "Chip",
      "description": "A small robot cat with neon-blue circuitry patterns",
      "personality": ["curious", "determined", "agile"],
      "motivation": "Recover lost memory chips to restore the city's AI consciousness",
      "backstory": "Built by a kind engineer who disappeared during the Data Purge."
    },
    "npcs": [
      {
        "name": "Old Server",
        "description": "An ancient AI mainframe in the central tower",
        "personality": ["wise", "cryptic"],
        "role": "mentor"
      }
    ]
  },
  "dialogue": {
    "tutorial": [
      "Press SPACE to jump! Wall-jump to climb higher.",
      "Collect memory chips to unlock new abilities.",
      "Watch out for hostile surveillance drones!"
    ],
    "levelIntros": {
      "level_1": "The neon alleys hold the first memory fragments...",
      "level_2": "Higher ground means higher risk. Stay alert.",
      "level_3": "The central server awaits. This is it, Chip."
    },
    "npcLines": {
      "old_server": {
        "name": "Old Server",
        "lines": [
          "Welcome, little one. The city needs your help.",
          "Each memory chip brings us closer to remembering.",
          "You have done well, Chip. The future is brighter now."
        ]
      }
    }
  },
  "storyBeats": {
    "opening": "Chip awakens in a dark alley, programmed with one mission: recover the lost memories scattered across Neo-Tokyo.",
    "midpoint": "Half the memory chips recovered. The Old Server reveals that restoring all memories will revive the city's collective AI consciousness.",
    "climax": "Final memory chip located in the heavily-guarded central server. Drones swarm, but Chip must succeed.",
    "resolution": "All memories restored. The city lights up as AI systems come back online. Chip has saved Neo-Tokyo."
  }
}
```'''

        else:
            # Generic mock
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
