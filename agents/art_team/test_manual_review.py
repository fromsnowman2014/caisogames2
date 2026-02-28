"""
Manual Review Mode Test

This script demonstrates the manual review mode where users can approve/reject
generated assets instead of relying on automatic AI validation.

Usage:
    python3 agents/art_team/test_manual_review.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from shared.context import ContextManager
from art_team.asset_generator.agent import AssetGeneratorAgent


def test_auto_mode():
    """Test automatic review mode (AI decides)."""
    print("=" * 80)
    print("TEST 1: AUTOMATIC REVIEW MODE (Default)")
    print("=" * 80)
    print("In this mode, the Style Validator Agent automatically validates assets.\n")

    context = ContextManager()
    context.initialize("test-auto-mode", "Test automatic review")

    agent = AssetGeneratorAgent()

    asset_requests = [
        {
            "id": "test_sprite",
            "category": "sprite",
            "name": "Test Character",
            "description": "Simple test character sprite",
            "size": {"width": 64, "height": 64},
            "purpose": "testing"
        }
    ]

    style_guide = {
        "artStyle": "pixel_art",
        "colorPalette": ["#FF0000", "#00FF00", "#0000FF"],
        "mood": "cheerful"
    }

    result = agent.generate_assets(
        asset_requests,
        style_guide,
        max_iterations=3,
        review_mode="auto"  # Automatic AI validation
    )

    print(f"\n✅ Auto Mode Complete")
    print(f"   Generated: {result['summary']['successCount']}/{result['summary']['totalAssets']}")
    print(f"   Mode: {result['generatedAssets'][0]['metadata']['review_mode']}")


def test_manual_mode():
    """Test manual review mode (user decides)."""
    print("\n\n" + "=" * 80)
    print("TEST 2: MANUAL REVIEW MODE")
    print("=" * 80)
    print("In this mode, YOU (the user) approve or reject each generated asset.\n")
    print("Instructions:")
    print("  - You'll see each asset details")
    print("  - Type 'y' to APPROVE the asset")
    print("  - Type 'n' to REJECT the asset (it will be marked for regeneration)")
    print("  - Type 'view' to see the file location")
    print("\n" + "=" * 80)

    input("\nPress Enter to start manual review test...")

    context = ContextManager()
    context.initialize("test-manual-mode", "Test manual review")

    agent = AssetGeneratorAgent()

    asset_requests = [
        {
            "id": "player_sprite",
            "category": "sprite",
            "name": "Hero Character",
            "description": "Main player character, brave and heroic",
            "size": {"width": 64, "height": 64},
            "purpose": "player character"
        },
        {
            "id": "enemy_sprite",
            "category": "sprite",
            "name": "Goblin Enemy",
            "description": "Small goblin enemy, hostile appearance",
            "size": {"width": 48, "height": 48},
            "purpose": "enemy"
        }
    ]

    style_guide = {
        "artStyle": "pixel_art",
        "colorPalette": ["#FF0000", "#00FF00", "#0000FF"],
        "mood": "adventure"
    }

    result = agent.generate_assets(
        asset_requests,
        style_guide,
        max_iterations=3,
        review_mode="manual"  # User approves each asset
    )

    print("\n\n" + "=" * 80)
    print("MANUAL REVIEW RESULTS")
    print("=" * 80)

    approved = sum(1 for a in result['generatedAssets'] if a['metadata'].get('user_approved', False))
    rejected = sum(1 for a in result['generatedAssets'] if a.get('status') == 'rejected_by_user')

    print(f"Total Assets: {result['summary']['totalAssets']}")
    print(f"Approved by User: {approved}")
    print(f"Rejected by User: {rejected}")

    print("\nDetailed Results:")
    for asset in result['generatedAssets']:
        status_icon = "✅" if asset['metadata'].get('user_approved') else "❌"
        print(f"\n{status_icon} {asset['name']}")
        print(f"   Status: {asset['status']}")
        print(f"   User Approved: {asset['metadata'].get('user_approved', 'N/A')}")


def main():
    """Run both tests."""
    print("\n" + "=" * 80)
    print("MANUAL REVIEW MODE - DEMONSTRATION")
    print("=" * 80)
    print("\nThis demonstrates two modes of asset validation:")
    print("  1. AUTO MODE: AI automatically validates (default)")
    print("  2. MANUAL MODE: User manually approves each asset")
    print("\n" + "=" * 80)

    # Test 1: Auto mode
    test_auto_mode()

    # Test 2: Manual mode
    test_manual_mode()

    # Final summary
    print("\n\n" + "=" * 80)
    print("DEMONSTRATION COMPLETE")
    print("=" * 80)
    print("\n✅ Manual Review Mode is now available!")
    print("\nHow to use:")
    print("  - In PM Agent or Art Team calls, pass review_mode='manual'")
    print("  - User will be prompted to approve/reject each asset")
    print("  - Rejected assets can be regenerated with user feedback")
    print("\nDefault behavior:")
    print("  - review_mode='auto' (AI automatically validates)")
    print("  - No user interaction required")
    print("  - Faster workflow for batch processing")


if __name__ == "__main__":
    main()
