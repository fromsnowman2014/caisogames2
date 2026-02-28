"""
Integrated Test for Art Team Agents

This script tests all Art Team agents together in a realistic workflow:
1. Asset Generator creates sprites and backgrounds
2. Style Validator validates the generated assets
3. Animation Creator generates animation frames
4. Audio Designer creates sound placeholders

This simulates the complete Art Team pipeline.
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from shared.context import ContextManager
from art_team.asset_generator.agent import AssetGeneratorAgent
from art_team.style_validator.agent import StyleValidatorAgent
from art_team.animation_creator.agent import AnimationCreatorAgent
from art_team.audio_designer.agent import AudioDesignerAgent


def main():
    """Run integrated Art Team test."""
    print("=" * 80)
    print("ART TEAM - INTEGRATED TEST")
    print("=" * 80)

    # Initialize context
    context = ContextManager()
    context.initialize("cyber-cat-game", "Create pixel art platformer with robot cat")

    # Initialize agents
    asset_gen = AssetGeneratorAgent()
    validator = StyleValidatorAgent()
    animator = AnimationCreatorAgent()
    audio = AudioDesignerAgent()

    # Define style guide
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

    # Step 1: Generate Assets
    print("\n" + "=" * 80)
    print("STEP 1: ASSET GENERATION")
    print("=" * 80)

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
            "name": "Memory Chip",
            "description": "Glowing memory chip collectible, cyan color",
            "size": {"width": 32, "height": 32},
            "purpose": "collectible"
        },
        {
            "id": "neon_city_bg",
            "category": "background",
            "name": "Neon City Background",
            "description": "Cyberpunk neon cityscape, dark night, purple and cyan neon signs",
            "size": {"width": 1920, "height": 600},
            "purpose": "level background"
        }
    ]

    asset_result = asset_gen.generate_assets(asset_requests, style_guide, max_iterations=3)

    print(f"\n✅ Generated {asset_result['summary']['successCount']}/{asset_result['summary']['totalAssets']} assets")
    print(f"   Total cost: ${asset_result['summary']['totalCost']}")

    # Step 2: Validate Assets
    print("\n" + "=" * 80)
    print("STEP 2: ASSET VALIDATION")
    print("=" * 80)

    validation_result = validator.validate_batch(
        asset_result["generatedAssets"],
        style_guide
    )

    print(f"\n✅ Validation complete")
    print(f"   Pass rate: {validation_result['summary']['pass_rate']}%")
    print(f"   Average score: {validation_result['summary']['average_score']}/100")

    # Step 3: Create Animations (for player character)
    print("\n" + "=" * 80)
    print("STEP 3: ANIMATION CREATION")
    print("=" * 80)

    player_sprite = next(
        (a for a in asset_result["generatedAssets"] if a["name"] == "Robot Cat Player"),
        None
    )

    if player_sprite:
        animation_result = animator.create_animations(
            player_sprite,
            ["idle", "walk", "jump", "fall"],
            style_guide
        )

        print(f"\n✅ Created {animation_result['summary']['total_animations']} animations")
        print(f"   Total frames: {animation_result['summary']['total_frames']}")
        print(f"   Sprite sheet: {animation_result['sprite_sheet']['width']}x{animation_result['sprite_sheet']['height']}")

    # Step 4: Generate Audio
    print("\n" + "=" * 80)
    print("STEP 4: AUDIO GENERATION")
    print("=" * 80)

    audio_requests = [
        {
            "name": "jump_sfx",
            "category": "player",
            "description": "8-bit jump sound, bright and bouncy"
        },
        {
            "name": "collect_memory_chip",
            "category": "player",
            "description": "Digital collection sound, satisfying ping"
        },
        {
            "name": "drone_alert",
            "category": "enemy",
            "description": "Warning beep, ominous tone"
        },
        {
            "name": "neon_alley_bgm",
            "category": "music",
            "description": "Cyberpunk synthwave background music, 120 BPM"
        }
    ]

    audio_result = audio.generate_audio(audio_requests, style_guide)

    print(f"\n⚠️  Audio API not configured ({audio_result['summary']['api_status']})")
    print(f"   Placeholder sounds: {audio_result['summary']['placeholder']}")

    # Final Summary
    print("\n" + "=" * 80)
    print("ART TEAM PIPELINE - COMPLETE")
    print("=" * 80)

    summary = {
        "assets": {
            "requested": asset_result['summary']['totalAssets'],
            "generated": asset_result['summary']['successCount'],
            "validated": validation_result['summary']['passed'],
            "cost": asset_result['summary']['totalCost']
        },
        "animations": {
            "created": animation_result['summary']['total_animations'] if player_sprite else 0,
            "total_frames": animation_result['summary']['total_frames'] if player_sprite else 0
        },
        "audio": {
            "requested": audio_result['summary']['total_sounds'],
            "status": audio_result['summary']['api_status']
        },
        "quality": {
            "validation_pass_rate": validation_result['summary']['pass_rate'],
            "average_score": validation_result['summary']['average_score']
        }
    }

    print(json.dumps(summary, indent=2))

    print("\n" + "=" * 80)
    print("PIPELINE STATUS")
    print("=" * 80)
    print("✅ Asset Generation: WORKING (Mock mode)")
    print("✅ Style Validation: WORKING (Mock mode)")
    print("✅ Animation Creation: WORKING (Mock mode)")
    print("⚠️  Audio Generation: PLACEHOLDER (External API required)")
    print("\n📝 Next Steps:")
    print("   1. Deploy Vercel functions (/api/gemini/imagen, /api/gemini/vision)")
    print("   2. Test with real Imagen 4 API")
    print("   3. Select and integrate audio API")
    print("   4. Integrate Art Team with PM Agent")


if __name__ == "__main__":
    main()
