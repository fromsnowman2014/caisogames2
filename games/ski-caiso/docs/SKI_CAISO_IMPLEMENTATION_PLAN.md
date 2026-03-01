# 🏂 Ski Caiso - Implementation Plan

**Date:** 2026-03-01
**Project:** Ski Caiso - 2D Endless Skiing Game
**Based on:** Design Document V1.1
**Development Approach:** AI-Powered Multi-Agent System

---

## 📋 Executive Summary

This plan outlines the complete development workflow for **Ski Caiso** using the CaisoGames V2 multi-agent system. The game will be built incrementally using existing agents (Design Team, Art Team, Engineering Team) in MOCK_MODE to avoid API costs during development.

**Key Strategy:**
- Use **MOCK_MODE** for all agent operations (no API keys required)
- Leverage **existing agent infrastructure** from Phase 1 & 2
- Generate game assets, code, and documentation automatically
- Deploy as standalone HTML5 game with no build dependencies

---

## 🎯 Game Overview (From Design Doc)

**Genre:** 2D Endless Runner with Physics-Based Skiing
**Core Mechanics:**
- Pumping (Down key on downhill = acceleration)
- Air tricks (Left/Right for flips)
- Procedural infinite terrain generation
- Difficulty scaling based on distance

**Technical Stack:**
- HTML5 Canvas (2D rendering)
- Vanilla JavaScript (ES6 Modules)
- Custom physics engine (no libraries)
- Procedural terrain generation with sine wave synthesis

---

## 🏗️ Development Phases

### Phase 1: Design & Planning ✅
**Agents Used:** PM Agent → Design Team (Concept, Level, Narrative)

**Inputs:**
- Design document: `games/ski-caiso/docs/ski-caiso-design_document.md`
- User request: "Create Ski Caiso endless skiing game with procedural terrain"

**Outputs:**
- `concept.json` - Core game concept, mechanics, visual style
- `levels.json` - Difficulty tiers, chunk patterns, terrain parameters
- `narrative.json` - UI copy, tutorial text, game over messages
- `project_context.json` - Complete game specification

**Execution:**
```bash
python3 agents/project_manager/pm_agent.py \
  "Create an endless 2D skiing game called Ski Caiso. Player controls a tiny hand-drawn skier sliding down procedurally generated snowy slopes. Core mechanics: pump on downhill (Down key) for speed, jump at hills (Up key), do flips in air (Left/Right keys). Terrain gets harder as distance increases. Physics-based with perfect landing bonuses. Infinite chunk-based terrain generation. Hand-drawn art style like Alto's Adventure meets Tiny Wings."
```

---

### Phase 2: Asset Generation 🎨
**Agents Used:** Art Team (Asset Generator, Style Validator, Animation Creator)

**Asset Requirements (from Design Doc):**

#### 2.1 Character Sprites
- **Skier (Idle)** - 64x64px, hand-drawn pixel art, facing right
- **Skier (Airborne)** - 64x64px, legs tucked for flip animation
- **Skier (Crash)** - 64x64px, tumbling pose for game over

#### 2.2 Terrain & Environment
- **Snow Texture** - 256x256px tileable, soft white with hand-drawn edges
- **Tree Obstacle** - 48x96px, evergreen tree silhouette
- **Snow Mound** - 128x64px, half-circle bump obstacle
- **River Water** - 512x128px, flowing blue water texture
- **Cliff Edge** - 64x64px, rocky cliff texture

#### 2.3 UI Elements
- **Distance Marker** - 32x32px, mountain icon
- **Score Icon** - 32x32px, trophy icon
- **Combo Flame** - 48x48px, fire icon for combo multiplier

#### 2.4 Background Layers (Parallax)
- **Sky** - 1920x600px, soft gradient blue to pink
- **Mountains Far** - 1920x400px, distant mountain silhouettes
- **Mountains Mid** - 1920x500px, mid-distance peaks
- **Trees Background** - 1920x300px, forest line

#### 2.5 Particle Effects
- **Snow Dust** - 16x16px, white particle for landing
- **Crash Explosion** - 32x32px, snow burst effect

**Style Guide:**
```json
{
  "artStyle": "hand_drawn",
  "colorPalette": ["#FFFFFF", "#E8F4F8", "#B0D4E3", "#4A90A4", "#2E5266"],
  "mood": "peaceful_winter",
  "constraints": {
    "maxColors": 16,
    "transparentBackground": true,
    "handDrawnEdges": true
  }
}
```

**Execution:**
```python
from agents.art_team.asset_generator.agent import AssetGeneratorAgent

agent = AssetGeneratorAgent()
result = agent.generate_assets(asset_requests, style_guide, review_mode="manual")
```

---

### Phase 3: Code Generation 💻
**Agents Used:** Engineering Team (Code Generator, Code Reviewer)

**Code Structure (from Design Doc Section 10.2):**

```
games/ski-caiso/
├── index.html                 # Entry point
├── src/
│   ├── core/
│   │   ├── Game.js           # Main loop, FSM, initialization
│   │   └── Physics.js        # Slope physics, collision, landing detection
│   ├── terrain/
│   │   ├── TerrainGenerator.js  # Sine wave synthesis, chunk generation
│   │   ├── ChunkManager.js      # Chunk streaming, memory management
│   │   └── ObstacleSpawner.js   # River, cliff, tree placement
│   ├── entities/
│   │   ├── Skier.js          # Player physics, tricks, state machine
│   │   └── Camera.js         # Dynamic zoom, smoothing, shake
│   ├── difficulty/
│   │   └── DifficultyManager.js # Tier calculation, parameter blending
│   ├── rendering/
│   │   ├── TerrainRenderer.js   # Snow terrain drawing
│   │   ├── ParallaxRenderer.js  # Background layers
│   │   └── ParticleSystem.js    # Snow dust, crash effects
│   └── ui/
│       ├── HUD.js            # Distance, score, combo display
│       └── ResultScreen.js   # Game over UI, best scores
└── assets/
    ├── sprites/              # Generated by Art Team
    └── backgrounds/          # Generated by Art Team
```

**Key Implementation Requirements:**

#### 3.1 Physics Engine (`Physics.js`)
```javascript
// From Design Doc Section 5
const PHYSICS = {
  gravity: 1200,           // px/s²
  pumpMultiplier: 2.0,     // Down key gravity boost
  friction: 0.02,          // Snow friction
  airResistance: 0.995,    // Air drag
  jumpImpulse: 650,        // Up key impulse
  maxSpeed: 2000,          // px/s
  angularSpeed: 8.0,       // rad/s for flips
  angularDamping: 0.98     // Angular velocity decay
};
```

#### 3.2 Terrain Generator (`TerrainGenerator.js`)
```javascript
// From Design Doc Section 6.3
function getTerrainY(x, params) {
  const { baseY, amp1, freq1, amp2, freq2, amp3, freq3, seed } = params;
  return baseY
    + amp1 * Math.sin(freq1 * x + seed)
    + amp2 * Math.sin(freq2 * x + seed * 1.3)
    + amp3 * Math.sin(freq3 * x + seed * 2.7);
}
```

#### 3.3 Difficulty Manager (`DifficultyManager.js`)
```javascript
// From Design Doc Section 7.2
const TIER_PARAMS = {
  1: { amp1: 80,  freq1: 0.003, riverProb: 0,    cliffProb: 0 },
  2: { amp1: 150, freq1: 0.004, riverProb: 0.10, cliffProb: 0 },
  3: { amp1: 220, freq1: 0.005, riverProb: 0.15, cliffProb: 0.05 },
  4: { amp1: 300, freq1: 0.006, riverProb: 0.20, cliffProb: 0.10 },
  5: { amp1: 400, freq1: 0.007, riverProb: 0.25, cliffProb: 0.15 },
  6: { amp1: 500, freq1: 0.008, riverProb: 0.30, cliffProb: 0.20 }
};
```

**Code Generation Prompt Template:**
```
Generate a complete implementation of [MODULE_NAME] for Ski Caiso game.

Requirements:
- ES6 module with named exports
- No external dependencies
- Follow physics constants from design doc
- Include inline comments for algorithm steps
- Handle edge cases (e.g., chunk boundary transitions)

Specification:
[PASTE RELEVANT DESIGN DOC SECTION]

Example Usage:
[CODE USAGE EXAMPLE]

Output format: Complete .js file ready to save
```

---

### Phase 4: Integration & Testing 🧪
**Agents Used:** QA Team (when available), Manual Testing

**Test Scenarios:**

#### 4.1 Core Mechanics Test
- [ ] Down key pumping increases speed on downhill
- [ ] Up key jump launches player at hill peaks
- [ ] Left/Right keys rotate player in air
- [ ] Perfect landing (0-15° angle diff) gives speed boost
- [ ] Crash landing (>60° angle diff) triggers game over

#### 4.2 Terrain Generation Test
- [ ] Chunks generate continuously as player moves right
- [ ] Old chunks unload from memory (check with DevTools)
- [ ] Terrain is smooth at chunk boundaries (no gaps/jumps)
- [ ] Difficulty increases correctly at Tier boundaries
- [ ] Rivers, cliffs, trees spawn at correct Tier levels

#### 4.3 Performance Test
- [ ] Maintains 60 FPS on desktop Chrome/Firefox
- [ ] Memory usage stable (no leaks after 10+ minutes)
- [ ] Mobile performance acceptable (45+ FPS on iPhone 12)

#### 4.4 UI/UX Test
- [ ] Distance counter updates correctly (meters)
- [ ] Score calculation matches design spec
- [ ] Combo multiplier displays correctly
- [ ] Game over screen shows final stats
- [ ] Best scores save to localStorage

**Execution:**
```bash
# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/games/ski-caiso/index.html

# Run automated tests (if QA agent available)
python3 agents/qa_team/test_executor.py ski-caiso
```

---

### Phase 5: Deployment 🚀
**Target:** Standalone HTML5 game (no build step required)

**Deployment Options:**

#### Option A: GitHub Pages (Recommended)
```bash
# Create gh-pages branch
git checkout -b gh-pages

# Copy game files to root
cp -r games/ski-caiso/* .

# Commit and push
git add .
git commit -m "Deploy Ski Caiso to GitHub Pages"
git push origin gh-pages

# Access at: https://fromsnowman2014.github.io/caisogames2/
```

#### Option B: Vercel Static Deployment
```bash
# Deploy only game folder
cd games/ski-caiso
vercel --prod

# Access at: https://ski-caiso.vercel.app
```

#### Option C: Local File System
```
Simply open: games/ski-caiso/index.html in browser
Works offline, no server required
```

---

## 🛠️ Agent Execution Plan

### Step 1: Initialize Project Context
```bash
cd /Users/seinoh/Desktop/github/CaisoGames2

# Create game directory structure
mkdir -p games/ski-caiso/{src/{core,terrain,entities,difficulty,rendering,ui},assets/{sprites,backgrounds}}

# Copy design doc (already exists)
# games/ski-caiso/docs/ski-caiso-design_document.md ✅
```

### Step 2: Run PM Agent + Design Team
```python
# File: run_ski_caiso_design.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from agents.project_manager.pm_agent import ProjectManagerAgent
from agents.shared.context import ContextManager

# Initialize context
context = ContextManager()
context.initialize(
    project_id="ski-caiso-v1",
    project_description="Endless 2D skiing game with procedural terrain"
)

# Run PM Agent
pm = ProjectManagerAgent()
result = pm.create_game(
    user_request="""
    Create Ski Caiso, an endless 2D skiing game.

    Core Mechanics:
    - Player is a tiny hand-drawn skier sliding down infinite snowy slopes
    - Down key = pump for speed on downhills (Tiny Wings style)
    - Up key = jump boost at hill peaks
    - Left/Right keys = flip tricks in mid-air
    - Perfect landing (matching slope angle) = speed bonus

    Terrain:
    - Procedurally generated chunks using sine wave synthesis
    - Infinite streaming (old chunks unload from memory)
    - Difficulty scaling: 6 tiers based on distance traveled
    - Obstacles: rivers, cliff gaps, trees, snow mounds

    Art Style:
    - Hand-drawn watercolor aesthetic (Alto's Adventure vibe)
    - Parallax background layers (sky, mountains, trees)
    - Small character sprite (3-5% of screen) to emphasize scale
    - Soft pastel winter color palette

    Technical:
    - HTML5 Canvas 2D rendering
    - Custom physics engine (slope-based acceleration)
    - No external libraries (pure ES6 modules)
    - Mobile-friendly touch controls

    Reference Design Document: games/ski-caiso/docs/ski-caiso-design_document.md
    """,
    number_of_levels=6,  # 6 difficulty tiers
    review_mode="auto"   # Use auto-validation in MOCK_MODE
)

# Save results
print(f"Design Phase Complete!")
print(f"Concept: {result['concept']['title']}")
print(f"Levels: {len(result['levels'])} difficulty tiers")
print(f"Narrative: {result['narrative']['title']}")
```

### Step 3: Run Art Team
```python
# File: run_ski_caiso_art.py
from agents.art_team.asset_generator.agent import AssetGeneratorAgent
from agents.art_team.style_validator.agent import StyleValidatorAgent
from agents.art_team.animation_creator.agent import AnimationCreatorAgent

# Asset requests (from Phase 2.1-2.5 above)
asset_requests = [
    # Character
    {"id": "skier_idle", "category": "sprite", "name": "Skier Idle",
     "description": "Tiny hand-drawn skier, skiing pose, facing right, cozy winter outfit",
     "size": {"width": 64, "height": 64}, "purpose": "player character"},

    {"id": "skier_air", "category": "sprite", "name": "Skier Airborne",
     "description": "Skier tucked for flip, legs pulled in, compact pose",
     "size": {"width": 64, "height": 64}, "purpose": "air trick animation"},

    {"id": "skier_crash", "category": "sprite", "name": "Skier Crash",
     "description": "Skier tumbling, chaotic fall pose",
     "size": {"width": 64, "height": 64}, "purpose": "game over animation"},

    # Environment
    {"id": "tree", "category": "sprite", "name": "Pine Tree",
     "description": "Hand-drawn evergreen tree, snow on branches",
     "size": {"width": 48, "height": 96}, "purpose": "obstacle"},

    {"id": "snow_mound", "category": "sprite", "name": "Snow Mound",
     "description": "Rounded snow bump, half-circle shape",
     "size": {"width": 128, "height": 64}, "purpose": "obstacle"},

    {"id": "river", "category": "background", "name": "River Water",
     "description": "Flowing blue river water, gentle waves",
     "size": {"width": 512, "height": 128}, "purpose": "hazard"},

    # Backgrounds
    {"id": "sky", "category": "background", "name": "Winter Sky",
     "description": "Soft gradient sky, pale blue to pink, peaceful winter atmosphere",
     "size": {"width": 1920, "height": 600}, "purpose": "parallax layer 1"},

    {"id": "mountains_far", "category": "background", "name": "Distant Mountains",
     "description": "Faint mountain silhouettes, very far away, misty",
     "size": {"width": 1920, "height": 400}, "purpose": "parallax layer 2"},

    {"id": "mountains_mid", "category": "background", "name": "Mid Mountains",
     "description": "Snowy mountain peaks, mid-distance, clear details",
     "size": {"width": 1920, "height": 500}, "purpose": "parallax layer 3"},

    {"id": "trees_bg", "category": "background", "name": "Forest Line",
     "description": "Line of pine trees at horizon, hand-drawn style",
     "size": {"width": 1920, "height": 300}, "purpose": "parallax layer 4"},

    # UI
    {"id": "icon_distance", "category": "icon", "name": "Distance Icon",
     "description": "Mountain peak icon, simple silhouette",
     "size": {"width": 32, "height": 32}, "purpose": "UI element"},

    {"id": "icon_score", "category": "icon", "name": "Score Trophy",
     "description": "Trophy icon, simple hand-drawn style",
     "size": {"width": 32, "height": 32}, "purpose": "UI element"},

    {"id": "icon_combo", "category": "icon", "name": "Combo Flame",
     "description": "Fire icon for combo multiplier, energetic",
     "size": {"width": 48, "height": 48}, "purpose": "UI element"}
]

style_guide = {
    "artStyle": "hand_drawn",
    "colorPalette": ["#FFFFFF", "#E8F4F8", "#B0D4E3", "#4A90A4", "#2E5266"],
    "mood": "peaceful_winter",
    "constraints": {
        "maxColors": 16,
        "transparentBackground": True,
        "noText": True
    }
}

# Generate assets
asset_gen = AssetGeneratorAgent()
result = asset_gen.generate_assets(
    asset_requests,
    style_guide,
    max_iterations=3,
    review_mode="manual"  # User reviews each asset
)

print(f"Assets Generated: {result['summary']['successCount']}/{result['summary']['totalAssets']}")
```

### Step 4: Generate Game Code
```python
# File: run_ski_caiso_code.py
# NOTE: Engineering Team agents not yet implemented (Phase 3)
# For now, manually implement following Design Doc structure

# Priority order:
# 1. TerrainGenerator.js - Core terrain synthesis
# 2. ChunkManager.js - Infinite streaming
# 3. Physics.js - Slope physics
# 4. Skier.js - Player entity
# 5. Game.js - Main loop
# 6. Remaining modules...
```

---

## 🚨 Known Blockers & Solutions

### Blocker 1: Vercel Deployment Fails
**Status:** ❌ Not working
**Impact:** Cannot use real Gemini API for asset generation

**Workaround:**
- Use **MOCK_MODE** for all agents
- Generate placeholder assets (text files)
- Manually create real assets later OR
- Set up local Gemini API proxy (outside Vercel)

### Blocker 2: Engineering Team Not Implemented
**Status:** ⚠️ Phase 3 pending
**Impact:** No automated code generation

**Workaround:**
- Manually implement game code following design doc
- Use Design Team output as specification
- Code Generator agent can be built later

### Blocker 3: Audio API Not Selected
**Status:** ⚠️ Pending decision
**Impact:** No sound effects or music

**Workaround:**
- Build game without audio first
- Add Web Audio API synthesized sounds (free, code-based)
- Integrate external audio API later if needed

---

## ✅ Success Criteria

**Minimum Viable Product (MVP):**
- [ ] Player can ski down procedurally generated terrain
- [ ] Down key pumping increases speed
- [ ] Jump and air tricks work
- [ ] Landing detection (perfect/crash) works
- [ ] Infinite terrain chunks stream correctly
- [ ] Difficulty increases with distance
- [ ] Game over screen displays final score
- [ ] Game runs at 60 FPS on desktop

**Full Release:**
- [ ] All assets generated and integrated
- [ ] All 6 difficulty tiers implemented
- [ ] All obstacle types (river, cliff, tree, mound) spawn correctly
- [ ] Parallax background layers animate
- [ ] Particle effects (snow dust, crash)
- [ ] Mobile touch controls
- [ ] Audio (music + SFX)
- [ ] Best scores saved locally
- [ ] Deployed to public URL

---

## 📝 Next Actions

1. **Run Design Team** (PM Agent + Concept/Level/Narrative)
2. **Run Art Team** (Generate all 13 assets with manual review)
3. **Manually Implement Core Modules** (TerrainGenerator, Physics, Skier)
4. **Integrate Assets** (Load sprites, backgrounds into game)
5. **Test & Debug** (Fix physics, tune difficulty)
6. **Deploy** (GitHub Pages or Vercel static)

---

**Implementation Start:** 2026-03-01
**Estimated Completion:** 2-3 days (with manual code implementation)
**Agent Team:** PM Agent, Design Team (3 agents), Art Team (3 agents)

---

*This plan will be executed step-by-step using the CaisoGames V2 multi-agent system.*
