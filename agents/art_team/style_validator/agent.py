"""
Style Validator Agent - Validates asset quality using Gemini Vision

This agent validates generated assets against the style guide using
Gemini's Vision capabilities to ensure consistency and quality.
"""

import os
import sys
import json
import base64
from typing import Dict, Any, List, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.llm import LLMService
from shared.context import ContextManager
from shared.event_bus import EventBus, Event, EventType
from shared.constants import ASSET_QUALITY_THRESHOLD


class StyleValidatorAgent:
    """
    Validates asset quality and style consistency using Gemini Vision.

    Responsibilities:
    - Validate generated assets against style guide
    - Score assets on multiple quality metrics
    - Provide improvement suggestions
    - Track validation history
    """

    # Validation criteria weights
    CRITERIA_WEIGHTS = {
        "style_consistency": 0.25,      # Matches art style guide
        "technical_quality": 0.20,      # Resolution, sharpness, clean edges
        "transparency": 0.20,            # Background removal quality
        "game_fit": 0.20,                # Size, readability, usability
        "composition": 0.15              # Centering, silhouette, spacing
    }

    def __init__(self):
        """Initialize the Style Validator Agent."""
        self.llm = LLMService()
        self.context = ContextManager()
        self.event_bus = EventBus()
        self.quality_threshold = ASSET_QUALITY_THRESHOLD

    def validate_asset(
        self,
        asset_path: str,
        style_guide: Dict[str, Any],
        asset_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate a single asset against the style guide.

        Args:
            asset_path: Path to the asset image
            style_guide: Art style guidelines
            asset_metadata: Metadata about the asset

        Returns:
            Validation result with score and feedback
        """
        print(f"\n🔍 Validating asset: {asset_path}")

        # For Phase 2 with Mock mode, return simulated validation
        # In production with Gemini Vision, this will analyze the actual image

        validation_result = self._simulate_validation(
            asset_path,
            style_guide,
            asset_metadata
        )

        # Emit event
        self.event_bus.emit(Event(
            type=EventType.ASSET_APPROVED if validation_result["passed"] else EventType.ASSET_REJECTED,
            source_agent="StyleValidatorAgent",
            payload={
                "asset": asset_path,
                "score": validation_result["overall_score"],
                "passed": validation_result["passed"]
            },
            timestamp=None
        ))

        return validation_result

    def validate_batch(
        self,
        assets: List[Dict[str, Any]],
        style_guide: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate multiple assets.

        Args:
            assets: List of asset dictionaries with 'path' and 'metadata'
            style_guide: Art style guidelines

        Returns:
            Batch validation results
        """
        print(f"\n🔍 Validating {len(assets)} assets...")

        results = []
        passed_count = 0
        total_score = 0.0

        for asset in assets:
            result = self.validate_asset(
                asset["image"]["path"],
                style_guide,
                asset.get("metadata", {})
            )
            results.append({
                "asset_name": asset.get("name", "unknown"),
                "asset_path": asset["image"]["path"],
                **result
            })

            if result["passed"]:
                passed_count += 1
            total_score += result["overall_score"]

        average_score = total_score / len(assets) if assets else 0

        summary = {
            "total_assets": len(assets),
            "passed": passed_count,
            "failed": len(assets) - passed_count,
            "pass_rate": (passed_count / len(assets) * 100) if assets else 0,
            "average_score": round(average_score, 2),
            "threshold": self.quality_threshold
        }

        return {
            "summary": summary,
            "results": results
        }

    def _simulate_validation(
        self,
        asset_path: str,
        style_guide: Dict[str, Any],
        asset_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Simulate validation (Mock mode for Phase 2).
        In production, this will call Gemini Vision API.

        Args:
            asset_path: Path to asset
            style_guide: Style guide
            asset_metadata: Asset metadata

        Returns:
            Simulated validation result
        """
        # Simulate scores for each criterion
        metrics = {
            "style_consistency": {
                "score": 92,
                "feedback": "Asset matches the pixel art style well with sharp edges and limited palette.",
                "suggestions": []
            },
            "technical_quality": {
                "score": 95,
                "feedback": "Clean edges, appropriate resolution, no artifacts detected.",
                "suggestions": []
            },
            "transparency": {
                "score": 88,
                "feedback": "Background mostly removed, minor edge artifacts visible.",
                "suggestions": ["Refine alpha channel around edges", "Check for white halo effect"]
            },
            "game_fit": {
                "score": 94,
                "feedback": "Appropriate size and detail level for game use.",
                "suggestions": []
            },
            "composition": {
                "score": 90,
                "feedback": "Well-centered with good spacing, clear silhouette.",
                "suggestions": ["Could benefit from slightly more bottom padding"]
            }
        }

        # Calculate weighted overall score
        overall_score = sum(
            metrics[criterion]["score"] * self.CRITERIA_WEIGHTS[criterion]
            for criterion in self.CRITERIA_WEIGHTS
        )

        # Collect all suggestions
        all_suggestions = []
        for metric in metrics.values():
            all_suggestions.extend(metric.get("suggestions", []))

        passed = overall_score >= self.quality_threshold

        result = {
            "overall_score": round(overall_score, 2),
            "passed": passed,
            "metrics": metrics,
            "improvement_suggestions": all_suggestions,
            "threshold": self.quality_threshold
        }

        # Print result
        status_icon = "✅" if passed else "❌"
        print(f"   {status_icon} Score: {result['overall_score']}/100 (threshold: {self.quality_threshold})")

        if not passed:
            print(f"   ⚠️  Below threshold - suggestions:")
            for suggestion in all_suggestions:
                print(f"      - {suggestion}")

        return result

    def _build_validation_prompt(
        self,
        style_guide: Dict[str, Any],
        asset_metadata: Dict[str, Any]
    ) -> str:
        """
        Build Gemini Vision validation prompt.
        This will be used in production with real Gemini Vision API.

        Args:
            style_guide: Art style guide
            asset_metadata: Asset metadata

        Returns:
            Validation prompt
        """
        prompt = f"""
Analyze this game asset against the style guide and rate its quality.

STYLE GUIDE:
- Art Style: {style_guide.get('artStyle', 'pixel_art')}
- Color Palette: {', '.join(style_guide.get('colorPalette', []))}
- Mood: {style_guide.get('mood', 'cheerful')}
- Constraints: {json.dumps(style_guide.get('constraints', {}), indent=2)}

ASSET PURPOSE: {asset_metadata.get('purpose', 'unknown')}
CATEGORY: {asset_metadata.get('category', 'sprite')}

EVALUATE on a 0-100 scale for each criterion:

1. STYLE CONSISTENCY (25% weight)
   - Does it match the required art style?
   - Is the color palette consistent?
   - Does it match the specified mood?

2. TECHNICAL QUALITY (20% weight)
   - Are edges sharp and clean (no blur/anti-aliasing for pixel art)?
   - Is the resolution appropriate?
   - Are there any artifacts or defects?

3. TRANSPARENCY (20% weight)
   - Is the background fully removed (white → transparent)?
   - Are there edge artifacts (white halos)?
   - Is the alpha channel clean?

4. GAME FIT (20% weight)
   - Is it appropriate size for game use?
   - Is it readable at game resolution?
   - Does it fit the game context?

5. COMPOSITION (15% weight)
   - Is the subject centered?
   - Is there good spacing from edges?
   - Is the silhouette clear?

For each metric provide:
- Numeric score (0-100)
- Brief feedback (1-2 sentences)
- Improvement suggestions (if score < 90)

OUTPUT FORMAT (JSON):
{{
  "overall_score": <weighted average>,
  "passed": <true if overall_score >= {self.quality_threshold}>,
  "metrics": {{
    "style_consistency": {{"score": <number>, "feedback": "<string>", "suggestions": []}},
    "technical_quality": {{"score": <number>, "feedback": "<string>", "suggestions": []}},
    "transparency": {{"score": <number>, "feedback": "<string>", "suggestions": []}},
    "game_fit": {{"score": <number>, "feedback": "<string>", "suggestions": []}},
    "composition": {{"score": <number>, "feedback": "<string>", "suggestions": []}}
  }},
  "improvement_suggestions": [<all suggestions combined>]
}}
"""
        return prompt.strip()


def main():
    """Test the Style Validator Agent."""
    # Initialize context
    context_manager = ContextManager()
    context_manager.initialize("test-style-validator", "Test asset validation")

    agent = StyleValidatorAgent()

    # Mock assets from Asset Generator
    test_assets = [
        {
            "name": "Robot Cat Player",
            "image": {
                "path": "generated-assets/sprite/robot_cat_player.mock.txt"
            },
            "metadata": {
                "purpose": "player character",
                "category": "sprite"
            }
        },
        {
            "name": "Hostile Drone",
            "image": {
                "path": "generated-assets/sprite/hostile_drone.mock.txt"
            },
            "metadata": {
                "purpose": "enemy",
                "category": "sprite"
            }
        },
        {
            "name": "Memory Chip",
            "image": {
                "path": "generated-assets/sprite/memory_chip_collectible.mock.txt"
            },
            "metadata": {
                "purpose": "collectible",
                "category": "sprite"
            }
        }
    ]

    style_guide = {
        "artStyle": "pixel_art",
        "colorPalette": ["#FF00FF", "#00FFFF", "#FF0080", "#8000FF", "#FFFFFF", "#000000"],
        "mood": "cyberpunk",
        "constraints": {
            "maxColors": 16,
            "noText": True,
            "transparentBackground": True
        }
    }

    print("=" * 80)
    print("STYLE VALIDATOR AGENT - TEST RUN")
    print("=" * 80)

    # Validate batch
    results = agent.validate_batch(test_assets, style_guide)

    print("\n" + "=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(json.dumps(results["summary"], indent=2))

    print("\n" + "=" * 80)
    print("INDIVIDUAL RESULTS")
    print("=" * 80)
    for result in results["results"]:
        status_icon = "✅" if result["passed"] else "❌"
        print(f"\n{status_icon} {result['asset_name']}")
        print(f"   Score: {result['overall_score']}/100")
        print(f"   Path: {result['asset_path']}")

        if result["improvement_suggestions"]:
            print(f"   Suggestions:")
            for suggestion in result["improvement_suggestions"]:
                print(f"      - {suggestion}")


if __name__ == "__main__":
    main()
