"""
JSON Schemas for Design Team outputs.
에이전트들이 생성하는 JSON의 타입 정의.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Ability:
    """플레이어 능력."""

    id: str
    name: str
    description: str
    unlock_condition: Optional[str] = None
    cooldown: Optional[float] = None  # seconds


@dataclass
class ConceptDesignOutput:
    """Concept Designer 출력 스키마."""

    concept: Dict[str, Any]  # Full concept object
    design_rationale: str
    reference_games: List[str]


@dataclass
class Platform:
    """레벨 플랫폼."""

    x: float
    y: float
    width: float
    height: float
    type: str  # "ground", "floating", "moving", "breakable"
    properties: Optional[Dict[str, Any]] = None


@dataclass
class Enemy:
    """레벨 적."""

    x: float
    y: float
    type: str
    behavior: str  # "patrol", "chase", "stationary"
    patrol_range: Optional[float] = None
    health: Optional[int] = None


@dataclass
class Collectible:
    """수집 아이템."""

    x: float
    y: float
    type: str  # "coin", "gem", "powerup"
    value: int
    required: bool = False


@dataclass
class Level:
    """레벨 정의."""

    id: str
    name: str
    difficulty: int  # 1-10
    theme: str
    layout: Dict[str, Any]  # Platforms, enemies, collectibles
    mechanics: Dict[str, List[str]]  # introduced, required
    estimated_completion_time: str
    skill_requirements: List[str]


@dataclass
class LevelDesignOutput:
    """Level Designer 출력 스키마."""

    levels: List[Level]
    difficulty_progression: Dict[str, str]
    total_estimated_playtime: int  # minutes


@dataclass
class Character:
    """캐릭터 정의."""

    name: str
    description: str
    personality: List[str]
    motivation: str
    backstory: Optional[str] = None


@dataclass
class NarrativeOutput:
    """Narrative Designer 출력 스키마."""

    world_setting: Dict[str, str]
    characters: Dict[str, Character]
    dialogue: Dict[str, Any]
    story_beats: Optional[Dict[str, str]] = None


# JSON 스키마 템플릿 (프롬프트에 포함할 수 있음)
CONCEPT_SCHEMA_TEMPLATE = """
{
  "concept": {
    "title": "string",
    "genre": "platformer|puzzle|shooter|etc",
    "tagline": "string (max 100 chars)",
    "coreLoop": ["step1", "step2", "step3"],
    "playerAbilities": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "unlockCondition": "optional string"
      }
    ],
    "progressionSystem": {
      "type": "linear|open_world|hub_based",
      "unlockMechanism": "level_completion|collectibles"
    },
    "mechanics": {
      "primary": ["string"],
      "secondary": ["string"],
      "unique": ["string"]
    },
    "difficultyCurve": {
      "type": "gradual|steep|flat",
      "description": "string"
    },
    "winCondition": "string",
    "loseCondition": "string",
    "estimatedPlaytime": 30
  },
  "designRationale": "Why these mechanics were chosen",
  "referenceGames": ["Game 1", "Game 2"]
}
"""

LEVEL_SCHEMA_TEMPLATE = """
{
  "levels": [
    {
      "id": "level_1",
      "name": "Forest Entry",
      "difficulty": 1,
      "theme": "forest",
      "layout": {
        "width": 3000,
        "height": 600,
        "platforms": [...],
        "enemies": [...],
        "collectibles": [...],
        "goal": {"x": 2800, "y": 500}
      },
      "mechanics": {
        "introduced": ["basic_jump"],
        "required": ["basic_jump", "timing"]
      },
      "estimatedCompletionTime": "2-3 minutes",
      "skillRequirements": ["basic_jump", "timing"]
    }
  ],
  "difficultyProgression": {
    "curve": "linear|exponential|stepped",
    "description": "..."
  },
  "totalEstimatedPlaytime": 30
}
"""

NARRATIVE_SCHEMA_TEMPLATE = """
{
  "worldSetting": {
    "name": "The Forgotten Forest",
    "description": "...",
    "lore": "..."
  },
  "characters": {
    "protagonist": {
      "name": "Caiso",
      "description": "...",
      "personality": ["curious", "determined"],
      "motivation": "...",
      "backstory": "..."
    }
  },
  "dialogue": {
    "tutorial": ["line 1", "line 2"],
    "npc_1": {
      "name": "Old Tree",
      "lines": ["line 1", "line 2"]
    }
  },
  "storyBeats": {
    "opening": "...",
    "climax": "...",
    "resolution": "..."
  }
}
"""
