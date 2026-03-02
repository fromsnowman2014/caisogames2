# 🏂 Ski Caiso

Endless 2D skiing game with procedural terrain generation and physics-based gameplay.

## 🎮 How to Play

### Controls
- **⬇️ Down Arrow** - Pump for speed on downhills (Tiny Wings style)
- **⬆️ Up Arrow / Space** - Jump boost at hill crests
- **⬅️ Left Arrow** - Backflip (while in air)
- **➡️ Right Arrow** - Frontflip (while in air)

### Objective
- Ski as far as possible down the infinite procedurally-generated slopes
- Master the pump mechanic to build speed on downhills
- Land perfectly (match slope angle) for speed boosts and combo multipliers
- Avoid crashing by landing at too steep an angle

### Difficulty Tiers
1. 🌿 **Pinecone Pass** (0-500m) - Gentle slopes
2. 🌲 **Forest Slopes** (500-1200m) - Moderate terrain
3. ⛰️ **Mountain Ridge** (1200-2500m) - Challenging hills
4. 🏔️ **High Peaks** (2500-4000m) - Steep slopes
5. 🌪️ **Storm Fields** (4000-6000m) - Extreme terrain
6. 💀 **Death Summit** (6000m+) - Chaos mode

## 🚀 Running Locally

### Option 1: Direct File Open
```bash
cd games/ski-caiso/src
open index.html
```

### Option 2: Local Server (Recommended)
```bash
cd games/ski-caiso/src
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Option 3: From Launcher
```bash
cd launcher
python3 -m http.server 3000
# Visit http://localhost:3000
# Click "Ski Caiso" card → Play button
```

## 🎯 Gameplay Features

### Implemented ✅
- Infinite procedural terrain generation (sine wave synthesis)
- Chunk-based memory management (no memory leaks)
- Slope-based physics (acceleration on downhills)
- Jump and aerial rotation mechanics
- Perfect landing detection system
- 6-tier automatic difficulty scaling
- Real-time HUD (distance, speed, combo)
- Smooth camera following

### Planned 🚧
- Game assets (currently using simple shapes)
- Obstacles (rivers, cliffs, trees)
- Particle effects (snow dust, crash explosion)
- Parallax background layers
- Sound effects and music
- Game over screen with stats
- High score persistence (localStorage)

## 🛠️ Technical Details

### Architecture
- **Engine**: Pure HTML5 Canvas (no libraries)
- **Physics**: Custom slope-based physics engine
- **Terrain**: Procedural sine wave synthesis
- **Memory**: Chunk streaming (loads ahead, unloads behind)
- **Modules**: ES6 imports (no build step required)

### File Structure
```
src/
├── index.html          # Entry point
├── main.js             # Initialization
├── core/
│   ├── Game.js         # Main game loop
│   └── Physics.js      # Physics engine
├── terrain/
│   ├── TerrainGenerator.js  # Sine wave terrain
│   └── ChunkManager.js      # Chunk streaming
├── difficulty/
│   └── DifficultyManager.js # Tier system
└── entities/
    ├── Skier.js        # Player entity
    └── Camera.js       # Camera system
```

### Performance
- Target: 60 FPS
- Memory: Stable (chunk cleanup)
- Canvas: 800x600px
- Mobile: Responsive design ready

## 📊 Scoring System

```
Final Score = Distance Score + Trick Score × Combo Multiplier

Distance Score:  Distance × Tier Multiplier
  Tier 1: 1.0x
  Tier 2: 1.5x
  Tier 3: 2.0x
  Tier 4: 3.0x
  Tier 5: 4.0x
  Tier 6: 6.0x

Trick Score:
  360° Rotation:  +100 pts
  Double Flip:    +350 pts
  Triple Flip:    +800 pts
  Perfect Landing: +50 pts

Combo Multiplier:
  3 perfect landings:  1.5x
  5 perfect landings:  2.0x
  10 perfect landings: 3.0x
```

## 🎨 Design Philosophy

Based on:
- **Tiny Wings** - Pumping mechanic, procedural terrain
- **Alto's Adventure** - Endless skiing, tricks, aesthetic
- **Ski Safari** - Infinite scrolling, distance-based gameplay

## 📝 Credits

- **Design**: Gemini 2.5 Pro (PM Agent, Design Team)
- **Code**: Claude Sonnet 4.5 (Engineering Team)
- **Platform**: CaisoGames V2 Multi-Agent System

## 🐛 Known Issues

None currently! Game is fully playable.

## 🔮 Future Enhancements

1. Real game assets (Imagen 4 generation)
2. Obstacle implementation
3. Audio system integration
4. Mobile touch controls
5. Leaderboard system
6. Unlockable abilities (Grind, Glide)

---

**Version**: 0.1.0
**Status**: Playable
**Last Updated**: 2026-03-01
