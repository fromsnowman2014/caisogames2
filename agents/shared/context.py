"""
Shared Project Context - 모든 에이전트가 접근 가능한 프로젝트 상태.
Singleton pattern으로 구현.
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import json


@dataclass
class ProjectContext:
    """모든 에이전트가 공유하는 프로젝트 컨텍스트."""

    project_id: str
    version: str = "0.1.0"
    phase: str = "design"  # design, development, testing, deployment
    created_at: datetime = field(default_factory=datetime.now)

    # User Request
    user_request: str = ""
    target_platform: List[str] = field(default_factory=lambda: ["web"])
    target_audience: str = ""

    # Design (Design Team 결과)
    design: Dict[str, Any] = field(default_factory=dict)

    # Assets (Art Team 결과)
    assets: Dict[str, Any] = field(default_factory=dict)
    style_guide: Dict[str, Any] = field(default_factory=dict)

    # Code (Engineering Team 결과)
    code: Dict[str, Any] = field(default_factory=dict)

    # Quality (QA Team 결과)
    quality: Dict[str, Any] = field(default_factory=dict)

    # Build (Integration Team 결과)
    build: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "project_id": self.project_id,
            "version": self.version,
            "phase": self.phase,
            "created_at": self.created_at.isoformat(),
            "user_request": self.user_request,
            "target_platform": self.target_platform,
            "target_audience": self.target_audience,
            "design": self.design,
            "assets": self.assets,
            "style_guide": self.style_guide,
            "code": self.code,
            "quality": self.quality,
            "build": self.build,
            "metadata": self.metadata,
        }

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProjectContext":
        """Create from dictionary."""
        data = data.copy()
        if "created_at" in data and isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        return cls(**data)


class ContextManager:
    """
    Singleton Context Manager - 전역 접근 가능.
    """

    _instance = None
    _context: Optional[ProjectContext] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def initialize(self, project_id: str, user_request: str):
        """Initialize new project context."""
        self._context = ProjectContext(
            project_id=project_id,
            user_request=user_request,
        )
        print(f"✅ Project context initialized: {project_id}")

    def get(self) -> ProjectContext:
        """Get current project context."""
        if self._context is None:
            raise RuntimeError("Context not initialized. Call initialize() first.")
        return self._context

    def update(self, **kwargs):
        """Update context fields."""
        if self._context is None:
            raise RuntimeError("Context not initialized.")

        for key, value in kwargs.items():
            if hasattr(self._context, key):
                setattr(self._context, key, value)
            else:
                print(f"⚠️  Warning: Unknown context field: {key}")

    def update_nested(self, section: str, data: Dict[str, Any]):
        """Update nested dictionary (e.g., design, assets)."""
        if self._context is None:
            raise RuntimeError("Context not initialized.")

        if hasattr(self._context, section):
            current = getattr(self._context, section)
            if isinstance(current, dict):
                current.update(data)
            else:
                setattr(self._context, section, data)
        else:
            print(f"⚠️  Warning: Unknown context section: {section}")

    def save(self, filepath: str):
        """Save context to file."""
        if self._context is None:
            raise RuntimeError("Context not initialized.")

        with open(filepath, "w") as f:
            f.write(self._context.to_json())

        print(f"💾 Context saved: {filepath}")

    def load(self, filepath: str):
        """Load context from file."""
        with open(filepath, "r") as f:
            data = json.load(f)

        self._context = ProjectContext.from_dict(data)
        print(f"📂 Context loaded: {filepath}")


# Global instance
context_manager = ContextManager()


# Helper functions
def get_context() -> ProjectContext:
    """Get current project context."""
    return context_manager.get()


def update_context(**kwargs):
    """Update context fields."""
    context_manager.update(**kwargs)


def update_design(data: Dict[str, Any]):
    """Update design section."""
    context_manager.update_nested("design", data)


def update_assets(data: Dict[str, Any]):
    """Update assets section."""
    context_manager.update_nested("assets", data)


def update_code(data: Dict[str, Any]):
    """Update code section."""
    context_manager.update_nested("code", data)


if __name__ == "__main__":
    # Test
    context_manager.initialize("test-project-001", "Create a platformer game")

    update_design({
        "genre": "platformer",
        "core_loop": ["Jump", "Collect", "Win"],
    })

    update_assets({
        "style": "pixel_art",
        "generated_count": 5,
    })

    ctx = get_context()
    print(ctx.to_json())

    # Save/load test
    context_manager.save("test_context.json")
    context_manager.load("test_context.json")
