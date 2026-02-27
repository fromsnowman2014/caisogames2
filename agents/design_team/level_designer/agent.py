"""
Level Designer Agent - Phase 1
레벨 구조, 오브젝트 배치, 난이도 조절을 담당.
"""

import json
import re
from pathlib import Path
from typing import Dict, Any, List

# Import shared utilities
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.llm import LLMService
from shared.event_bus import emit_event, EventType
from shared.context import update_design
from shared.constants import GEMINI_PRO_MODEL


class LevelDesignerAgent:
    """
    Level Designer Agent - V2 개선사항:
    - Event Bus 통합
    - Context 공유
    - 구조화된 JSON 출력
    - 레벨 도달 가능성 검증
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

    def design_levels(
        self,
        game_concept: Dict[str, Any],
        number_of_levels: int = 3,
        platform: str = "web",
    ) -> Dict[str, Any]:
        """
        Design levels based on game concept.

        Args:
            game_concept: Output from Concept Designer
            number_of_levels: Number of levels to create
            platform: Target platform

        Returns:
            Level design as dictionary
        """

        print(f"\n🗺️  Level Designer Agent")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"Levels to create: {number_of_levels}")
        print(f"Platform: {platform}\n")

        # Emit start event
        emit_event(
            EventType.DESIGN_STARTED,
            "LevelDesignerAgent",
            {"number_of_levels": number_of_levels},
        )

        # Load and fill prompt template
        prompt_template = self.load_prompt("level_design")

        # Convert concept to readable format
        concept_summary = self._format_concept_for_prompt(game_concept)

        prompt = prompt_template.replace("{{ game_concept }}", concept_summary)
        prompt = prompt.replace("{{ number_of_levels }}", str(number_of_levels))
        prompt = prompt.replace("{{ platform }}", platform)

        print("⏳ Generating levels with Gemini...\n")

        # Generate levels
        response = self.llm.generate(prompt)

        # Parse JSON
        try:
            levels_data = self._extract_json(response)
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            print(f"Raw response:\n{response}\n")
            emit_event(
                EventType.DESIGN_FAILED,
                "LevelDesignerAgent",
                {"error": str(e)},
            )
            raise

        # Validate levels
        validation = self._validate_levels(levels_data, game_concept)

        if not validation["passed"]:
            print(f"⚠️  Level validation warnings:")
            for issue in validation["issues"]:
                print(f"   - {issue}")

        # Print summary
        self._print_levels_summary(levels_data)

        # Update shared context
        update_design({"levels": levels_data})

        # Emit completion event
        emit_event(
            EventType.DESIGN_COMPLETED,
            "LevelDesignerAgent",
            {
                "levels": levels_data,
                "quality_score": validation["score"],
            },
        )

        # Print LLM stats
        stats = self.llm.get_stats()
        print(f"\n💰 Cost: ${stats['estimated_cost_usd']:.4f}")
        print(f"📊 Tokens: {stats['total_tokens']:,}")

        return levels_data

    def _format_concept_for_prompt(self, game_concept: Dict[str, Any]) -> str:
        """Format game concept for inclusion in prompt."""
        concept = game_concept.get("concept", {})

        lines = []
        lines.append(f"Title: {concept.get('title', 'N/A')}")
        lines.append(f"Genre: {concept.get('genre', 'N/A')}")
        lines.append(f"Core Loop: {' → '.join(concept.get('coreLoop', []))}")

        abilities = concept.get('playerAbilities', [])
        lines.append(f"\nPlayer Abilities:")
        for ability in abilities:
            lines.append(f"  - {ability.get('name')}: {ability.get('description')}")

        mechanics = concept.get('mechanics', {})
        lines.append(f"\nUnique Mechanics:")
        for mech in mechanics.get('unique', []):
            lines.append(f"  - {mech}")

        return "\n".join(lines)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response (handles markdown)."""
        # Try to find JSON in markdown code blocks
        json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Assume entire response is JSON
            json_str = text

        return json.loads(json_str)

    def _validate_levels(
        self, levels_data: Dict[str, Any], game_concept: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate level quality."""
        issues = []
        score = 100

        levels = levels_data.get("levels", [])

        if not levels:
            issues.append("No levels generated")
            return {"passed": False, "score": 0, "issues": issues}

        # Check difficulty progression
        prev_difficulty = 0
        for i, level in enumerate(levels):
            difficulty = level.get("difficulty", 0)

            # Difficulty should increase gradually
            if i > 0 and difficulty < prev_difficulty:
                issues.append(f"Level {i+1} difficulty decreased (should be increasing)")
                score -= 10

            # No sudden spikes
            if i > 0 and difficulty > prev_difficulty + 3:
                issues.append(f"Level {i+1} difficulty spike too steep")
                score -= 15

            prev_difficulty = difficulty

            # Check layout
            layout = level.get("layout", {})
            if not layout.get("platforms"):
                issues.append(f"Level {level.get('name')} has no platforms")
                score -= 20

            if not layout.get("goal"):
                issues.append(f"Level {level.get('name')} has no goal")
                score -= 20

        # Check total playtime
        total_time = levels_data.get("totalEstimatedPlaytime", 0)
        if total_time < 5:
            issues.append("Total playtime too short (< 5 min)")
            score -= 10
        elif total_time > 60:
            issues.append("Total playtime too long (> 60 min)")
            score -= 10

        return {
            "passed": score >= 70,
            "score": max(0, score),
            "issues": issues,
        }

    def _print_levels_summary(self, levels_data: Dict[str, Any]):
        """Print formatted levels summary."""
        levels = levels_data.get("levels", [])

        print(f"\n✅ Level Design Complete!")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"📊 Total Levels: {len(levels)}")
        print(f"⏱️  Total Playtime: {levels_data.get('totalEstimatedPlaytime', 0)} minutes")

        for i, level in enumerate(levels, 1):
            print(f"\n📍 Level {i}: {level.get('name', 'N/A')}")
            print(f"   Difficulty: {level.get('difficulty', 0)}/10")
            print(f"   Theme: {level.get('theme', 'N/A')}")

            layout = level.get('layout', {})
            print(f"   Platforms: {len(layout.get('platforms', []))}")
            print(f"   Enemies: {len(layout.get('enemies', []))}")
            print(f"   Collectibles: {len(layout.get('collectibles', []))}")

            mechanics = level.get('mechanics', {})
            introduced = mechanics.get('introduced', [])
            if introduced:
                print(f"   New Mechanics: {', '.join(introduced)}")


if __name__ == "__main__":
    # Test run
    agent = LevelDesignerAgent()

    # Mock concept for testing
    mock_concept = {
        "concept": {
            "title": "Forest Adventure",
            "genre": "platformer",
            "coreLoop": ["Jump", "Collect", "Avoid Enemies", "Reach Goal"],
            "playerAbilities": [
                {
                    "id": "jump",
                    "name": "Jump",
                    "description": "Basic jump ability",
                },
                {
                    "id": "double_jump",
                    "name": "Double Jump",
                    "description": "Jump again in mid-air",
                },
            ],
            "mechanics": {
                "unique": ["wall_slide", "momentum_preservation"]
            },
        }
    }

    levels = agent.design_levels(
        game_concept=mock_concept,
        number_of_levels=3,
        platform="web",
    )

    # Save levels
    output_path = Path("levels_output.json")
    output_path.write_text(json.dumps(levels, indent=2))
    print(f"\n💾 Levels saved: {output_path}")
