"""
Asset Generator Agent - Generates game assets using Gemini Imagen 4

This agent creates high-quality game assets (sprites, backgrounds, UI elements)
using Gemini's Imagen 4 model with iterative refinement.
"""

import os
import sys
import json
import time
import base64
from typing import Dict, Any, List, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.llm import LLMService
from shared.context import ContextManager
from shared.event_bus import EventBus, Event, EventType
from shared.constants import QUALITY_THRESHOLDS


class AssetGeneratorAgent:
    """
    Generates game assets using Gemini Imagen 4.

    Responsibilities:
    - Generate sprites, backgrounds, UI elements using Imagen 4
    - Iterative refinement until quality threshold is met
    - Transparent background handling
    - Asset metadata generation
    """

    # Style templates for different art styles
    STYLE_TEMPLATES = {
        "pixel_art": """
Style: 16-bit retro pixel art game sprite

Technical requirements:
- Sharp pixel edges (NO anti-aliasing, NO blur)
- Limited color palette: {palette_size} colors maximum
- Pixel-perfect details (no smooth gradients)
- Clean, readable silhouette
- Centered composition on WHITE background

Visual style:
- Retro game aesthetic (SNES/Genesis era)
- Each pixel intentional and crisp
- Flat colors with minimal dithering
- Strong outlines for clarity

Subject positioning:
- Perfectly centered in frame
- Appropriate size for {size}px canvas
- Clear spacing from edges
- Isolated subject (no environmental elements)
""",

        "hand_drawn": """
Style: Hand-drawn 2D game illustration

Art direction:
- Bold, confident outlines (2-3px thick)
- Flat color fills with subtle shading
- Vibrant, saturated color palette
- Cartoon/anime-inspired proportions
- Expressive, dynamic poses

Technical requirements:
- Vector-art quality (clean edges)
- White background for transparency extraction
- No textures or patterns
- Clear visual hierarchy

Mood: {mood}
""",

        "low_poly": """
Style: Low-poly 3D game asset

Art direction:
- Geometric, angular shapes
- Flat shading (no smooth normals)
- Bold color blocks
- Minimal polygon count
- Clean silhouette

Technical requirements:
- Isometric or 3/4 view
- White background
- Clear depth perception
- Game-ready topology

Mood: {mood}
"""
    }

    # Category-specific instructions
    CATEGORY_INSTRUCTIONS = {
        "sprite": """
Sprite-specific requirements:
- Character should face RIGHT (standard game convention)
- Neutral pose (T-pose or idle stance)
- Limbs clearly separated (for animation rigging)
- Proportions consistent for pixel grid
- Maximum visual clarity at small sizes
""",

        "background": """
Background-specific requirements:
- Horizontal composition (landscape orientation)
- Depth suggestion (foreground, midground, background elements)
- Tileable edges if pattern-based
- Low detail density (won't distract from gameplay)
- Atmospheric perspective for depth
""",

        "ui": """
UI element requirements:
- High contrast for readability
- Consistent visual language (matches other UI)
- Clear affordances (buttons look clickable)
- Scalable design (works at multiple sizes)
- Game-appropriate aesthetic
""",

        "icon": """
Icon requirements:
- Simple, recognizable silhouette
- Clear at small sizes (16x16, 32x32)
- Consistent stroke width
- Centered composition
- No fine details that won't scale
"""
    }

    def __init__(self):
        """Initialize the Asset Generator Agent."""
        self.llm = LLMService()
        self.context = ContextManager()
        self.event_bus = EventBus()
        self.output_dir = Path("generated-assets")
        self.output_dir.mkdir(exist_ok=True)

    def generate_assets(
        self,
        asset_requests: List[Dict[str, Any]],
        style_guide: Dict[str, Any],
        max_iterations: int = 5
    ) -> Dict[str, Any]:
        """
        Generate multiple assets with the given style guide.

        Args:
            asset_requests: List of asset specifications
            style_guide: Art style and constraints
            max_iterations: Maximum refinement iterations per asset

        Returns:
            Dictionary with generated assets and metadata
        """
        self.event_bus.emit(Event(
            type=EventType.ASSET_GENERATION_STARTED,
            source_agent="AssetGeneratorAgent",
            payload={
                "asset_count": len(asset_requests),
                "style": style_guide.get("artStyle", "pixel_art")
            },
            timestamp=None  # Will auto-fill in __post_init__
        ))

        generated_assets = []
        total_cost = 0.0
        total_iterations = 0

        for request in asset_requests:
            try:
                asset = self._generate_single_asset(
                    request,
                    style_guide,
                    max_iterations
                )
                generated_assets.append(asset)
                total_cost += asset["metadata"].get("cost", 0.0)
                total_iterations += asset["metadata"].get("iterations", 0)

            except Exception as e:
                print(f"❌ Failed to generate asset {request['name']}: {e}")
                generated_assets.append({
                    "requestId": request.get("id", request["name"]),
                    "name": request["name"],
                    "status": "failed",
                    "error": {
                        "message": str(e),
                        "reason": "generation_error"
                    }
                })

        result = {
            "generatedAssets": generated_assets,
            "summary": {
                "totalAssets": len(asset_requests),
                "successCount": sum(1 for a in generated_assets if a["status"] == "success"),
                "failedCount": sum(1 for a in generated_assets if a["status"] == "failed"),
                "totalIterations": total_iterations,
                "totalCost": round(total_cost, 4)
            }
        }

        self.event_bus.emit(Event(
            type=EventType.ASSET_GENERATED,
            source_agent="AssetGeneratorAgent",
            payload=result["summary"],
            timestamp=None
        ))

        # Update context with generated assets
        self.context.update_nested("assets", {"generated_assets": result})

        return result

    def _generate_single_asset(
        self,
        request: Dict[str, Any],
        style_guide: Dict[str, Any],
        max_iterations: int
    ) -> Dict[str, Any]:
        """
        Generate a single asset with iterative refinement.

        Args:
            request: Asset specification
            style_guide: Art style guide
            max_iterations: Maximum iterations

        Returns:
            Generated asset with metadata
        """
        print(f"\n🎨 Generating asset: {request['name']}")
        print(f"   Category: {request['category']}")
        print(f"   Size: {request['size']['width']}x{request['size']['height']}")

        # For Phase 1, we'll create mock assets
        # In Phase 2 with real Imagen 4, this will call the actual API

        # Build the prompt
        prompt = self._build_prompt(request, style_guide)

        # Simulate asset generation (Mock mode)
        asset_path = self._create_mock_asset(request)

        return {
            "requestId": request.get("id", request["name"]),
            "name": request["name"],
            "status": "success",
            "image": {
                "path": str(asset_path),
                "format": "png",
                "size": request["size"],
                "fileSize": 0  # Mock
            },
            "metadata": {
                "prompt": prompt,
                "model": "imagen-4.0-generate-001",
                "iterations": 1,  # Mock
                "bestIteration": 1,
                "qualityScore": 95,  # Mock
                "generationTime": 0.5,  # Mock
                "cost": 0.01  # Mock
            }
        }

    def _build_prompt(
        self,
        request: Dict[str, Any],
        style_guide: Dict[str, Any]
    ) -> str:
        """
        Build a detailed Imagen 4 prompt.

        Args:
            request: Asset specification
            style_guide: Art style guide

        Returns:
            Detailed prompt string
        """
        art_style = style_guide.get("artStyle", "pixel_art")

        # Get base style template
        base_style = self.STYLE_TEMPLATES.get(art_style, self.STYLE_TEMPLATES["pixel_art"])
        base_style = base_style.format(
            palette_size=style_guide.get("constraints", {}).get("maxColors", 32),
            size=request["size"]["width"],
            mood=style_guide.get("mood", "cheerful")
        )

        # Get category-specific instructions
        category_instructions = self.CATEGORY_INSTRUCTIONS.get(
            request["category"],
            ""
        )

        # Build color palette hint
        color_hint = ""
        if "colorPalette" in style_guide and style_guide["colorPalette"]:
            color_hint = f"\nColor palette to use: {', '.join(style_guide['colorPalette'])}"

        # Compose final prompt
        full_prompt = f"""
Create a {request['category']} for a {art_style} style game.

SUBJECT: {request['description']}
PURPOSE: {request['purpose']}

{base_style}

{category_instructions}

{color_hint}

CRITICAL REQUIREMENTS:
- White (#FFFFFF) background ONLY (for transparency)
- No text, no UI elements, no watermarks
- Production-quality, commercial-grade artwork
- Perfectly centered subject
- Clean, game-ready asset

Negative prompt: text, words, letters, watermark, signature, complex background,
gradient background, multiple subjects, blur, soft edges, low quality
"""

        return full_prompt.strip()

    def _create_mock_asset(self, request: Dict[str, Any]) -> Path:
        """
        Create a mock asset file (placeholder for Phase 2).

        Args:
            request: Asset specification

        Returns:
            Path to created mock asset
        """
        category = request["category"]
        name = request["name"].replace(" ", "_").lower()

        # Create category directory
        category_dir = self.output_dir / category
        category_dir.mkdir(exist_ok=True)

        # Create a simple text file as placeholder
        # In Phase 2, this will be an actual PNG image
        asset_path = category_dir / f"{name}.mock.txt"

        with open(asset_path, "w") as f:
            f.write(f"MOCK ASSET\n")
            f.write(f"Name: {request['name']}\n")
            f.write(f"Category: {category}\n")
            f.write(f"Size: {request['size']['width']}x{request['size']['height']}\n")
            f.write(f"Description: {request['description']}\n")
            f.write(f"\nThis is a placeholder. In Phase 2, this will be a real PNG image\n")
            f.write(f"generated by Gemini Imagen 4.\n")

        print(f"   ✅ Mock asset created: {asset_path}")

        return asset_path


def main():
    """Test the Asset Generator Agent."""
    # Initialize context for testing
    context_manager = ContextManager()
    context_manager.initialize("test-asset-gen", "Generate test game assets")

    agent = AssetGeneratorAgent()

    # Example asset requests
    asset_requests = [
        {
            "id": "player_sprite",
            "category": "sprite",
            "name": "Robot Cat Player",
            "description": "Cute robot cat character, standing idle pose, facing right, mechanical ears, LED eyes",
            "size": {"width": 64, "height": 64},
            "purpose": "player character"
        },
        {
            "id": "enemy_drone",
            "category": "sprite",
            "name": "Hostile Drone",
            "description": "Small flying security drone, red warning light, hostile appearance",
            "size": {"width": 48, "height": 48},
            "purpose": "enemy"
        },
        {
            "id": "memory_chip",
            "category": "sprite",
            "name": "Memory Chip Collectible",
            "description": "Glowing memory chip, cyan color, floating animation",
            "size": {"width": 32, "height": 32},
            "purpose": "collectible"
        },
        {
            "id": "neon_city_bg",
            "category": "background",
            "name": "Neon City Background",
            "description": "Cyberpunk neon cityscape, dark night, purple and cyan neon signs, skyscrapers",
            "size": {"width": 1920, "height": 600},
            "purpose": "level background"
        }
    ]

    style_guide = {
        "artStyle": "pixel_art",
        "colorPalette": ["#FF00FF", "#00FFFF", "#FF0080", "#8000FF", "#FFFFFF", "#000000"],
        "pixelDensity": "64x64",
        "mood": "cyberpunk",
        "constraints": {
            "maxColors": 16,
            "noText": True,
            "transparentBackground": True
        }
    }

    print("=" * 80)
    print("ASSET GENERATOR AGENT - TEST RUN")
    print("=" * 80)

    result = agent.generate_assets(asset_requests, style_guide, max_iterations=3)

    print("\n" + "=" * 80)
    print("GENERATION SUMMARY")
    print("=" * 80)
    print(json.dumps(result["summary"], indent=2))

    print("\n" + "=" * 80)
    print("GENERATED ASSETS")
    print("=" * 80)
    for asset in result["generatedAssets"]:
        status_icon = "✅" if asset["status"] == "success" else "❌"
        print(f"\n{status_icon} {asset['name']}")
        print(f"   Status: {asset['status']}")
        if asset["status"] == "success":
            print(f"   Path: {asset['image']['path']}")
            print(f"   Quality: {asset['metadata']['qualityScore']}/100")
            print(f"   Iterations: {asset['metadata']['iterations']}")
        else:
            print(f"   Error: {asset['error']['message']}")


if __name__ == "__main__":
    main()
