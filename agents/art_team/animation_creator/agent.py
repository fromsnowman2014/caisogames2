"""
Animation Creator Agent - Creates sprite animation frames

This agent generates animation frames for sprites and assembles them into
sprite sheets with metadata.
"""

import os
import sys
import json
from typing import Dict, Any, List, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from shared.llm import LLMService
from shared.context import ContextManager
from shared.event_bus import EventBus, Event, EventType


class AnimationCreatorAgent:
    """
    Creates sprite animations from base sprites.

    Responsibilities:
    - Generate animation frames for different states (idle, walk, jump, etc.)
    - Ensure frame-to-frame consistency
    - Create sprite sheets
    - Generate animation metadata (FPS, loop settings, frame sequences)
    """

    # Standard animation types
    STANDARD_ANIMATIONS = {
        "idle": {
            "frames": 4,
            "fps": 8,
            "loop": True,
            "description": "character standing still, slight breathing motion"
        },
        "walk": {
            "frames": 6,
            "fps": 12,
            "loop": True,
            "description": "character walking forward, natural gait cycle"
        },
        "run": {
            "frames": 6,
            "fps": 16,
            "loop": True,
            "description": "character running, faster and more dynamic"
        },
        "jump": {
            "frames": 4,
            "fps": 12,
            "loop": False,
            "description": "character jumping upward, take-off to peak"
        },
        "fall": {
            "frames": 2,
            "fps": 8,
            "loop": True,
            "description": "character falling downward"
        },
        "attack": {
            "frames": 5,
            "fps": 14,
            "loop": False,
            "description": "character performing attack action"
        }
    }

    def __init__(self):
        """Initialize the Animation Creator Agent."""
        self.llm = LLMService()
        self.context = ContextManager()
        self.event_bus = EventBus()

    def create_animations(
        self,
        base_sprite: Dict[str, Any],
        animation_list: List[str],
        style_guide: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create animation frames for a character sprite.

        Args:
            base_sprite: Base sprite data (path, size, etc.)
            animation_list: List of animations to create (e.g., ["idle", "walk", "jump"])
            style_guide: Art style guide for consistency

        Returns:
            Animation data with sprite sheet and metadata
        """
        print(f"\n🎬 Creating animations for: {base_sprite.get('name', 'unknown')}")
        print(f"   Animations: {', '.join(animation_list)}")

        animations = []
        total_frames = 0

        for anim_name in animation_list:
            if anim_name in self.STANDARD_ANIMATIONS:
                anim_def = self.STANDARD_ANIMATIONS[anim_name]

                animation = self._create_animation(
                    base_sprite,
                    anim_name,
                    anim_def,
                    style_guide
                )

                animations.append(animation)
                total_frames += anim_def["frames"]

                print(f"   ✅ {anim_name}: {anim_def['frames']} frames @ {anim_def['fps']} FPS")
            else:
                print(f"   ⚠️  Unknown animation: {anim_name}")

        result = {
            "character": base_sprite.get("name", "unknown"),
            "animations": animations,
            "sprite_sheet": self._create_sprite_sheet(animations, base_sprite),
            "summary": {
                "total_animations": len(animations),
                "total_frames": total_frames
            }
        }

        # Update context
        self.context.update_nested("assets", {
            "animations": result
        })

        return result

    def _create_animation(
        self,
        base_sprite: Dict[str, Any],
        anim_name: str,
        anim_def: Dict[str, Any],
        style_guide: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a single animation.

        In Phase 2 with Mock mode, this returns simulated data.
        In production, this will generate actual frames using Imagen 4.
        """
        return {
            "name": anim_name,
            "frames": anim_def["frames"],
            "fps": anim_def["fps"],
            "loop": anim_def["loop"],
            "description": anim_def["description"],
            "frame_paths": [
                f"generated-assets/animations/{base_sprite.get('name', 'character')}_{anim_name}_frame_{i}.mock.txt"
                for i in range(anim_def["frames"])
            ]
        }

    def _create_sprite_sheet(
        self,
        animations: List[Dict[str, Any]],
        base_sprite: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Assemble animations into a sprite sheet.

        Args:
            animations: List of animation data
            base_sprite: Base sprite information

        Returns:
            Sprite sheet data
        """
        # Calculate total frames
        total_frames = sum(anim["frames"] for anim in animations)

        # Assume 8 frames per row for sprite sheet layout
        frames_per_row = 8
        rows = (total_frames + frames_per_row - 1) // frames_per_row

        sprite_width = base_sprite.get("size", {}).get("width", 64)
        sprite_height = base_sprite.get("size", {}).get("height", 64)

        sheet_width = frames_per_row * sprite_width
        sheet_height = rows * sprite_height

        return {
            "path": f"generated-assets/animations/{base_sprite.get('name', 'character')}_spritesheet.mock.txt",
            "width": sheet_width,
            "height": sheet_height,
            "frame_width": sprite_width,
            "frame_height": sprite_height,
            "frames_per_row": frames_per_row,
            "total_frames": total_frames,
            "animations_metadata": [
                {
                    "name": anim["name"],
                    "start_frame": sum(animations[j]["frames"] for j in range(i)),
                    "frame_count": anim["frames"],
                    "fps": anim["fps"],
                    "loop": anim["loop"]
                }
                for i, anim in enumerate(animations)
            ]
        }


def main():
    """Test the Animation Creator Agent."""
    # Initialize context
    context_manager = ContextManager()
    context_manager.initialize("test-animation", "Test animation creation")

    agent = AnimationCreatorAgent()

    # Test sprite
    base_sprite = {
        "name": "robot_cat",
        "size": {"width": 64, "height": 64},
        "path": "generated-assets/sprite/robot_cat_player.mock.txt"
    }

    style_guide = {
        "artStyle": "pixel_art",
        "colorPalette": ["#FF00FF", "#00FFFF", "#FF0080", "#8000FF"],
        "mood": "cyberpunk"
    }

    print("=" * 80)
    print("ANIMATION CREATOR AGENT - TEST RUN")
    print("=" * 80)

    # Create animations
    result = agent.create_animations(
        base_sprite,
        ["idle", "walk", "jump", "fall", "attack"],
        style_guide
    )

    print("\n" + "=" * 80)
    print("ANIMATION SUMMARY")
    print("=" * 80)
    print(json.dumps(result["summary"], indent=2))

    print("\n" + "=" * 80)
    print("SPRITE SHEET INFO")
    print("=" * 80)
    sheet = result["sprite_sheet"]
    print(f"Size: {sheet['width']}x{sheet['height']}")
    print(f"Frame Size: {sheet['frame_width']}x{sheet['frame_height']}")
    print(f"Total Frames: {sheet['total_frames']}")
    print(f"Layout: {sheet['frames_per_row']} frames per row")

    print("\n" + "=" * 80)
    print("ANIMATIONS")
    print("=" * 80)
    for anim_meta in sheet["animations_metadata"]:
        print(f"\n{anim_meta['name'].upper()}")
        print(f"  Frames: {anim_meta['start_frame']} - {anim_meta['start_frame'] + anim_meta['frame_count'] - 1}")
        print(f"  FPS: {anim_meta['fps']}")
        print(f"  Loop: {anim_meta['loop']}")


if __name__ == "__main__":
    main()
