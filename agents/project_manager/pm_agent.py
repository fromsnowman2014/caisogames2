"""
Project Manager Agent - Phase 1 Prototype
전체 워크플로우를 조율하는 오케스트레이터.

Phase 1 scope: Design Team만 조율 (Concept Designer)
"""

import json
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

# Import shared utilities
import sys

sys.path.append(str(Path(__file__).parent.parent))

from shared.context import context_manager, get_context
from shared.event_bus import event_bus, EventType
from design_team.concept_designer.agent import ConceptDesignerAgent


class ProjectManagerAgent:
    """
    PM Agent - Phase 1 버전 (Design Team만 조율)
    """

    def __init__(self):
        self.concept_designer = ConceptDesignerAgent()

    def create_game(self, user_request: str, project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        게임 생성 메인 워크플로우.

        Phase 1: Design Team만 실행
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
        print(f"│  PHASE 1: DESIGN                                        │")
        print(f"└─────────────────────────────────────────────────────────┘\n")

        # Run Concept Designer
        concept = self.concept_designer.design_concept(
            user_request=user_request,
            genre=self._infer_genre(user_request),
            target_audience="casual gamers",
            platform="web",
        )

        # Get final context
        final_context = get_context()

        # Save context
        output_dir = Path("output") / project_id
        output_dir.mkdir(parents=True, exist_ok=True)

        context_path = output_dir / "project_context.json"
        context_manager.save(str(context_path))

        concept_path = output_dir / "concept.json"
        concept_path.write_text(json.dumps(concept, indent=2))

        # Summary
        print(f"\n╔═══════════════════════════════════════════════════════════╗")
        print(f"║  ✅ PHASE 1 COMPLETE                                     ║")
        print(f"╚═══════════════════════════════════════════════════════════╝\n")
        print(f"📁 Output Directory: {output_dir}")
        print(f"   ├─ project_context.json")
        print(f"   └─ concept.json")

        # Event history
        events = event_bus.get_history()
        print(f"\n📊 Event History ({len(events)} events):")
        for event in events:
            print(f"   • {event.type.value} ({event.source_agent})")

        return {
            "project_id": project_id,
            "concept": concept,
            "output_dir": str(output_dir),
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
