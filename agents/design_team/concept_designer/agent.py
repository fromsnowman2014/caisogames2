"""
Concept Designer Agent - Phase 1
게임의 핵심 메카닉, 장르, 플레이어 경험 설계.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any

# Import shared utilities
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.llm import LLMService
from shared.event_bus import emit_event, EventType
from shared.context import update_design
from shared.constants import GEMINI_PRO_MODEL


class ConceptDesignerAgent:
    """
    Concept Designer Agent - V2 개선사항:
    - Event Bus 통합
    - Context 공유
    - 구조화된 JSON 출력
    - 품질 검증
    """

    def __init__(self):
        self.llm = LLMService(model=GEMINI_PRO_MODEL)
        self.prompts_dir = Path(__file__).parent / "prompts"

    def load_prompt(self, name: str) -> str:
        """Load prompt template."""
        path = self.prompts_dir / f"{name}.txt"
        if not path.exists():
            raise FileNotFoundError(f"Prompt not found: {path}")
        return path.read_text(encoding="utf-8")

    def design_concept(
        self,
        user_request: str,
        genre: str = "platformer",
        target_audience: str = "casual gamers",
        platform: str = "web",
    ) -> Dict[str, Any]:
        """
        Design game concept based on user request.

        Args:
            user_request: User's game description
            genre: Game genre hint
            target_audience: Target player demographic
            platform: Target platform

        Returns:
            Concept design as dictionary
        """

        print(f"\n🎨 Concept Designer Agent")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"Request: {user_request}")
        print(f"Genre: {genre}")
        print(f"Platform: {platform}\n")

        # Emit start event
        emit_event(
            EventType.DESIGN_STARTED,
            "ConceptDesignerAgent",
            {"user_request": user_request},
        )

        # Load and fill prompt template
        prompt_template = self.load_prompt("concept_design")
        prompt = prompt_template.replace("{{ user_request }}", user_request)
        prompt = prompt.replace("{{ genre }}", genre)
        prompt = prompt.replace("{{ target_audience }}", target_audience)
        prompt = prompt.replace("{{ platform }}", platform)

        print("⏳ Generating concept with Gemini...\n")

        # Generate concept
        response = self.llm.generate(prompt)

        # Parse JSON
        try:
            concept_data = self._extract_json(response)
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            print(f"Raw response:\n{response}\n")
            # Emit failure event
            emit_event(
                EventType.DESIGN_FAILED,
                "ConceptDesignerAgent",
                {"error": str(e)},
            )
            raise

        # Validate concept
        validation = self._validate_concept(concept_data)

        if not validation["passed"]:
            print(f"⚠️  Concept validation warnings:")
            for issue in validation["issues"]:
                print(f"   - {issue}")

        # Print summary
        self._print_concept_summary(concept_data)

        # Update shared context
        update_design(concept_data)

        # Emit completion event
        emit_event(
            EventType.DESIGN_COMPLETED,
            "ConceptDesignerAgent",
            {
                "concept": concept_data,
                "quality_score": validation["score"],
            },
        )

        # Print LLM stats
        stats = self.llm.get_stats()
        print(f"\n💰 Cost: ${stats['estimated_cost_usd']:.4f}")
        print(f"📊 Tokens: {stats['total_tokens']:,}")

        return concept_data

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response (handles markdown)."""
        import re

        # Try to find JSON in markdown code blocks
        json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Assume entire response is JSON
            json_str = text

        return json.loads(json_str)

    def _validate_concept(self, concept_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate concept quality."""
        issues = []
        score = 100

        concept = concept_data.get("concept", {})

        # Check core loop
        core_loop = concept.get("coreLoop", [])
        if len(core_loop) < 3:
            issues.append("Core loop too simple (need 3+ steps)")
            score -= 15

        # Check abilities
        abilities = concept.get("playerAbilities", [])
        if len(abilities) < 2:
            issues.append("Too few player abilities (need 2+)")
            score -= 15

        # Check unique mechanics
        unique = concept.get("mechanics", {}).get("unique", [])
        if not unique:
            issues.append("No unique mechanics defined")
            score -= 20

        # Check playtime
        playtime = concept.get("estimatedPlaytime", 0)
        if playtime < 5:
            issues.append("Playtime too short (< 5 min)")
            score -= 10
        elif playtime > 120:
            issues.append("Playtime too long (> 2 hours, scope risk)")
            score -= 10

        return {
            "passed": score >= 70,
            "score": max(0, score),
            "issues": issues,
        }

    def _print_concept_summary(self, concept_data: Dict[str, Any]):
        """Print formatted concept summary."""
        concept = concept_data.get("concept", {})

        print(f"\n✅ Concept Design Complete!")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"📌 Title: {concept.get('title', 'N/A')}")
        print(f"🎮 Genre: {concept.get('genre', 'N/A')}")
        print(f"💬 Tagline: {concept.get('tagline', 'N/A')}")
        print(f"\n🔁 Core Loop:")
        for step in concept.get("coreLoop", []):
            print(f"   → {step}")

        print(f"\n⚡ Player Abilities ({len(concept.get('playerAbilities', []))}total):")
        for ability in concept.get("playerAbilities", [])[:3]:
            print(f"   • {ability.get('name')}: {ability.get('description')}")

        unique_mechanics = concept.get("mechanics", {}).get("unique", [])
        print(f"\n✨ Unique Mechanics:")
        for mech in unique_mechanics:
            print(f"   • {mech}")

        print(f"\n⏱️  Estimated Playtime: {concept.get('estimatedPlaytime', 0)} minutes")

        refs = concept_data.get("referenceGames", [])
        if refs:
            print(f"\n📚 Reference Games: {', '.join(refs)}")


if __name__ == "__main__":
    # Test run
    agent = ConceptDesignerAgent()

    concept = agent.design_concept(
        user_request="Create a pixel art platformer where you play as a cute cat navigating through a magical forest, collecting fish and avoiding owls.",
        genre="platformer",
        platform="web",
    )

    # Save concept
    output_path = Path("concept_output.json")
    output_path.write_text(json.dumps(concept, indent=2))
    print(f"\n💾 Concept saved: {output_path}")
