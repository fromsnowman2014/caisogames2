"""
Narrative Designer Agent - Phase 1
게임의 세계관, 캐릭터 설정, 스토리라인 작성을 담당.
"""

import json
import re
from pathlib import Path
from typing import Dict, Any

# Import shared utilities
import sys

sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.llm import LLMService
from shared.event_bus import emit_event, EventType
from shared.context import update_design
from shared.constants import GEMINI_PRO_MODEL


class NarrativeDesignerAgent:
    """
    Narrative Designer Agent - V2 개선사항:
    - Event Bus 통합
    - Context 공유
    - 구조화된 JSON 출력
    - 간결하고 명확한 대사 (모바일 친화적)
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

    def design_narrative(
        self,
        game_concept: Dict[str, Any],
        levels_data: Dict[str, Any],
        target_audience: str = "casual gamers",
    ) -> Dict[str, Any]:
        """
        Design game narrative based on concept and levels.

        Args:
            game_concept: Output from Concept Designer
            levels_data: Output from Level Designer
            target_audience: Target player demographic

        Returns:
            Narrative design as dictionary
        """

        print(f"\n📖 Narrative Designer Agent")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f"Target Audience: {target_audience}\n")

        # Emit start event
        emit_event(
            EventType.DESIGN_STARTED,
            "NarrativeDesignerAgent",
            {"target_audience": target_audience},
        )

        # Load and fill prompt template
        prompt_template = self.load_prompt("narrative_design")

        # Format concept and levels for prompt
        concept_summary = self._format_concept(game_concept)
        levels_summary = self._format_levels(levels_data)

        prompt = prompt_template.replace("{{ game_concept }}", concept_summary)
        prompt = prompt.replace("{{ levels_summary }}", levels_summary)
        prompt = prompt.replace("{{ target_audience }}", target_audience)

        print("⏳ Generating narrative with Gemini...\n")

        # Generate narrative
        response = self.llm.generate(prompt)

        # Parse JSON
        try:
            narrative_data = self._extract_json(response)
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse JSON: {e}")
            print(f"Raw response:\n{response}\n")
            emit_event(
                EventType.DESIGN_FAILED,
                "NarrativeDesignerAgent",
                {"error": str(e)},
            )
            raise

        # Validate narrative
        validation = self._validate_narrative(narrative_data, game_concept)

        if not validation["passed"]:
            print(f"⚠️  Narrative validation warnings:")
            for issue in validation["issues"]:
                print(f"   - {issue}")

        # Print summary
        self._print_narrative_summary(narrative_data)

        # Update shared context
        update_design({"narrative": narrative_data})

        # Emit completion event
        emit_event(
            EventType.DESIGN_COMPLETED,
            "NarrativeDesignerAgent",
            {
                "narrative": narrative_data,
                "quality_score": validation["score"],
            },
        )

        # Print LLM stats
        stats = self.llm.get_stats()
        print(f"\n💰 Cost: ${stats['estimated_cost_usd']:.4f}")
        print(f"📊 Tokens: {stats['total_tokens']:,}")

        return narrative_data

    def _format_concept(self, game_concept: Dict[str, Any]) -> str:
        """Format game concept for prompt."""
        concept = game_concept.get("concept", {})

        lines = []
        lines.append(f"Title: {concept.get('title', 'N/A')}")
        lines.append(f"Genre: {concept.get('genre', 'N/A')}")
        lines.append(f"Tagline: {concept.get('tagline', 'N/A')}")
        lines.append(f"Win Condition: {concept.get('winCondition', 'N/A')}")

        return "\n".join(lines)

    def _format_levels(self, levels_data: Dict[str, Any]) -> str:
        """Format levels for prompt."""
        levels = levels_data.get("levels", [])

        lines = []
        for i, level in enumerate(levels, 1):
            lines.append(f"Level {i}: {level.get('name')} (Theme: {level.get('theme')})")

        return "\n".join(lines)

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response."""
        json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            json_str = text

        return json.loads(json_str)

    def _validate_narrative(
        self, narrative_data: Dict[str, Any], game_concept: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate narrative quality."""
        issues = []
        score = 100

        # Check world setting
        world = narrative_data.get("worldSetting", {})
        if not world.get("name"):
            issues.append("World name missing")
            score -= 15

        if not world.get("description"):
            issues.append("World description missing")
            score -= 15

        # Check protagonist
        protagonist = narrative_data.get("characters", {}).get("protagonist", {})
        if not protagonist.get("name"):
            issues.append("Protagonist name missing")
            score -= 20

        if not protagonist.get("personality"):
            issues.append("Protagonist personality missing")
            score -= 10

        # Check dialogue
        dialogue = narrative_data.get("dialogue", {})
        if not dialogue.get("tutorial"):
            issues.append("Tutorial dialogue missing")
            score -= 15

        # Check dialogue length (should be concise for mobile)
        for key, value in dialogue.items():
            if isinstance(value, list):
                for line in value:
                    if len(line) > 150:
                        issues.append(f"Dialogue too long (> 150 chars): {key}")
                        score -= 5

        return {
            "passed": score >= 70,
            "score": max(0, score),
            "issues": issues,
        }

    def _print_narrative_summary(self, narrative_data: Dict[str, Any]):
        """Print formatted narrative summary."""
        print(f"\n✅ Narrative Design Complete!")
        print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        world = narrative_data.get("worldSetting", {})
        print(f"🌍 World: {world.get('name', 'N/A')}")
        print(f"   {world.get('description', 'N/A')}")

        protagonist = narrative_data.get("characters", {}).get("protagonist", {})
        print(f"\n🦸 Protagonist: {protagonist.get('name', 'N/A')}")
        print(f"   {protagonist.get('description', 'N/A')}")
        personality = protagonist.get('personality', [])
        if personality:
            print(f"   Personality: {', '.join(personality)}")

        dialogue = narrative_data.get("dialogue", {})
        tutorial_lines = dialogue.get("tutorial", [])
        if tutorial_lines:
            print(f"\n💬 Tutorial Dialogue ({len(tutorial_lines)} lines):")
            for line in tutorial_lines[:2]:  # Show first 2 lines
                print(f"   - \"{line}\"")


if __name__ == "__main__":
    # Test run
    agent = NarrativeDesignerAgent()

    # Mock data for testing
    mock_concept = {
        "concept": {
            "title": "Forest Adventure",
            "genre": "platformer",
            "tagline": "A cute cat's journey through a magical forest",
            "winCondition": "Collect all fish and reach the ancient tree",
        }
    }

    mock_levels = {
        "levels": [
            {"name": "Forest Entry", "theme": "forest"},
            {"name": "Dark Woods", "theme": "forest_dark"},
            {"name": "Ancient Tree", "theme": "magical_forest"},
        ]
    }

    narrative = agent.design_narrative(
        game_concept=mock_concept,
        levels_data=mock_levels,
        target_audience="casual gamers",
    )

    # Save narrative
    output_path = Path("narrative_output.json")
    output_path.write_text(json.dumps(narrative, indent=2))
    print(f"\n💾 Narrative saved: {output_path}")
