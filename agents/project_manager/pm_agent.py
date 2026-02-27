"""
Project Manager Agent - Phase 1 Prototype
전체 워크플로우를 조율하는 오케스트레이터.

Phase 1 scope: Design Team만 조율 (Concept Designer)
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

# Import shared utilities
import sys

sys.path.append(str(Path(__file__).parent.parent))

from shared.context import context_manager, get_context
from shared.event_bus import event_bus, EventType
from design_team.concept_designer.agent import ConceptDesignerAgent
from design_team.level_designer.agent import LevelDesignerAgent
from design_team.narrative_designer.agent import NarrativeDesignerAgent


class ProjectManagerAgent:
    """
    PM Agent - Phase 1 완전 버전 (Design Team 전체 조율)
    """

    def __init__(self):
        self.concept_designer = ConceptDesignerAgent()
        self.level_designer = LevelDesignerAgent()
        self.narrative_designer = NarrativeDesignerAgent()

    def create_game(
        self,
        user_request: str,
        project_id: Optional[str] = None,
        number_of_levels: int = 3,
    ) -> Dict[str, Any]:
        """
        게임 생성 메인 워크플로우.

        Phase 1: Design Team 전체 실행 (Concept, Level, Narrative)
        """

        # Generate project ID
        if not project_id:
            project_id = f"game-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        print(f"\n╔═══════════════════════════════════════════════════════════╗")
        print(f"║  🎮 CAISOGAMES V2 - Project Manager Agent               ║")
        print(f"╚═══════════════════════════════════════════════════════════╝")
        print(f"\nProject ID: {project_id}")
        print(f"User Request: {user_request}\n")

        # Initialize context
        context_manager.initialize(project_id, user_request)

        # Phase 1: Design Team
        print(f"\n┌─────────────────────────────────────────────────────────┐")
        print(f"│  PHASE 1: DESIGN (3 agents running)                    │")
        print(f"└─────────────────────────────────────────────────────────┘\n")

        # Step 1: Run Concept Designer
        print("Step 1/3: Concept Designer")
        print("─" * 60)
        concept = self.concept_designer.design_concept(
            user_request=user_request,
            genre=self._infer_genre(user_request),
            target_audience="casual gamers",
            platform="web",
        )

        # Step 2: Run Level Designer (depends on concept)
        print("\n\nStep 2/3: Level Designer")
        print("─" * 60)
        levels = self.level_designer.design_levels(
            game_concept=concept,
            number_of_levels=number_of_levels,
            platform="web",
        )

        # Step 3: Run Narrative Designer (depends on concept + levels)
        print("\n\nStep 3/3: Narrative Designer")
        print("─" * 60)
        narrative = self.narrative_designer.design_narrative(
            game_concept=concept,
            levels_data=levels,
            target_audience="casual gamers",
        )

        # Get final context
        final_context = get_context()

        # Save all outputs
        output_dir = Path("output") / project_id
        output_dir.mkdir(parents=True, exist_ok=True)

        context_path = output_dir / "project_context.json"
        context_manager.save(str(context_path))

        concept_path = output_dir / "concept.json"
        concept_path.write_text(json.dumps(concept, indent=2))

        levels_path = output_dir / "levels.json"
        levels_path.write_text(json.dumps(levels, indent=2))

        narrative_path = output_dir / "narrative.json"
        narrative_path.write_text(json.dumps(narrative, indent=2))

        # Quality Gate Check
        print(f"\n\n┌─────────────────────────────────────────────────────────┐")
        print(f"│  QUALITY GATE: Design Review                            │")
        print(f"└─────────────────────────────────────────────────────────┘\n")

        quality_report = self._quality_gate_design(final_context)

        # Summary
        print(f"\n\n╔═══════════════════════════════════════════════════════════╗")
        print(f"║  ✅ PHASE 1 COMPLETE                                     ║")
        print(f"╚═══════════════════════════════════════════════════════════╝\n")
        print(f"📁 Output Directory: {output_dir}")
        print(f"   ├─ project_context.json")
        print(f"   ├─ concept.json")
        print(f"   ├─ levels.json")
        print(f"   └─ narrative.json")

        # Event history
        events = event_bus.get_history()
        print(f"\n📊 Event History ({len(events)} events):")
        for event in events:
            print(f"   • {event.type.value} ({event.source_agent})")

        # Quality summary
        print(f"\n🎯 Quality Gate Results:")
        print(f"   Overall Score: {quality_report['overall_score']}/100")
        print(f"   Status: {'✅ PASSED' if quality_report['passed'] else '⚠️ NEEDS IMPROVEMENT'}")

        return {
            "project_id": project_id,
            "concept": concept,
            "levels": levels,
            "narrative": narrative,
            "output_dir": str(output_dir),
            "quality_report": quality_report,
        }

    def _quality_gate_design(self, context) -> Dict[str, Any]:
        """Quality gate for design phase."""
        from shared.constants import DESIGN_QUALITY_THRESHOLD

        design_data = context.design

        scores = []
        issues = []

        # Check concept
        if "concept" in design_data:
            concept = design_data["concept"].get("concept", {})
            concept_score = 100

            if len(concept.get("coreLoop", [])) < 3:
                concept_score -= 15
                issues.append("Core loop too simple")

            if len(concept.get("playerAbilities", [])) < 2:
                concept_score -= 15
                issues.append("Too few player abilities")

            if not concept.get("mechanics", {}).get("unique"):
                concept_score -= 20
                issues.append("No unique mechanics")

            scores.append(concept_score)
            print(f"   Concept Quality: {concept_score}/100")

        # Check levels
        if "levels" in design_data:
            levels = design_data["levels"].get("levels", [])
            levels_score = 100 if len(levels) >= 3 else 70

            scores.append(levels_score)
            print(f"   Levels Quality: {levels_score}/100")

        # Check narrative
        if "narrative" in design_data:
            narrative = design_data["narrative"]
            narrative_score = 100

            if not narrative.get("worldSetting", {}).get("name"):
                narrative_score -= 20
                issues.append("World name missing")

            if not narrative.get("characters", {}).get("protagonist"):
                narrative_score -= 20
                issues.append("Protagonist undefined")

            scores.append(narrative_score)
            print(f"   Narrative Quality: {narrative_score}/100")

        overall_score = sum(scores) // len(scores) if scores else 0
        passed = overall_score >= DESIGN_QUALITY_THRESHOLD

        if issues:
            print(f"\n   Issues Found:")
            for issue in issues:
                print(f"   ⚠️  {issue}")

        return {
            "overall_score": overall_score,
            "passed": passed,
            "issues": issues,
            "threshold": DESIGN_QUALITY_THRESHOLD,
        }

    def _infer_genre(self, request: str) -> str:
        """Infer genre from user request."""
        request_lower = request.lower()

        if any(word in request_lower for word in ["platform", "jump", "mario"]):
            return "platformer"
        elif any(word in request_lower for word in ["puzzle", "match", "tetris"]):
            return "puzzle"
        elif any(word in request_lower for word in ["shoot", "bullet", "gun"]):
            return "shooter"
        elif any(word in request_lower for word in ["rpg", "adventure", "quest"]):
            return "rpg"
        else:
            return "action"


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        request = " ".join(sys.argv[1:])
    else:
        request = "Create a pixel art platformer game with a cute cat hero"

    pm = ProjectManagerAgent()
    result = pm.create_game(request)

    print(f"\n\n🎉 Project {result['project_id']} created successfully!")
