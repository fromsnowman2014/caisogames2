# CaisoGames V2 - Game Folder Structure Guide

## 📋 Overview

Each game in CaisoGames V2 is **completely self-contained** in its own folder under `/games/`. This modular approach allows:

- Independent development and deployment of each game
- Easy version control per game
- Clear separation of game-specific assets and code
- Xbox-style launcher that loads games dynamically
- Simple game addition/removal without affecting other games

## 🗂️ Standard Game Folder Structure

```
games/
├── <game-name>/                    # Kebab-case game folder name
│   ├── README.md                   # Game-specific README
│   ├── package.json                # Game dependencies (if needed)
│   ├── game.config.json            # Game metadata for launcher
│   │
│   ├── docs/                       # Game design documents
│   │   ├── design_document.md
│   │   ├── implementation_plan.md
│   │   └── changelog.md
│   │
│   ├── assets/                     # All game assets
│   │   ├── sprites/                # Character sprites, objects
│   │   ├── backgrounds/            # Background images
│   │   ├── ui/                     # UI elements, buttons
│   │   ├── audio/                  # Sound effects, music
│   │   │   ├── sfx/
│   │   │   └── music/
│   │   ├── fonts/                  # Custom fonts
│   │   └── data/                   # JSON data files
│   │
│   ├── src/                        # Game source code
│   │   ├── index.html              # Game entry point
│   │   ├── main.js                 # Main game file
│   │   ├── game.js                 # Game class
│   │   ├── config.js               # Game configuration
│   │   │
│   │   ├── core/                   # Core game systems
│   │   │   ├── Engine.js
│   │   │   ├── GameLoop.js
│   │   │   └── EventSystem.js
│   │   │
│   │   ├── entities/               # Game entities (player, enemies)
│   │   │   ├── Player.js
│   │   │   ├── Enemy.js
│   │   │   └── Collectible.js
│   │   │
│   │   ├── systems/                # Game-specific systems
│   │   │   ├── Physics.js
│   │   │   ├── Collision.js
│   │   │   └── Input.js
│   │   │
│   │   ├── rendering/              # Rendering systems
│   │   │   ├── Renderer.js
│   │   │   ├── Camera.js
│   │   │   └── ParticleSystem.js
│   │   │
│   │   ├── ui/                     # UI components
│   │   │   ├── HUD.js
│   │   │   ├── Menu.js
│   │   │   └── GameOver.js
│   │   │
│   │   └── utils/                  # Game-specific utilities
│   │       ├── math.js
│   │       └── helpers.js
│   │
│   ├── tests/                      # Game tests
│   │   ├── unit/
│   │   └── integration/
│   │
│   └── dist/                       # Built game (gitignored)
│       └── bundle.js
```

## 📝 Required Files

### 1. `game.config.json` - Game Metadata

This file is used by the launcher to display game info:

```json
{
  "id": "ski-caiso",
  "name": "Ski Caiso",
  "version": "1.0.0",
  "description": "Endless 2D skiing game with procedural terrain",
  "author": "CaisoGames AI Team",
  "genre": "Endless Platformer",
  "tags": ["skiing", "endless", "procedural", "2D"],

  "thumbnail": "assets/ui/thumbnail.png",
  "banner": "assets/ui/banner.png",
  "icon": "assets/ui/icon.png",

  "entryPoint": "src/index.html",
  "buildCommand": "npm run build",
  "

  "controls": {
    "keyboard": {
      "down": "Pump for speed",
      "up": "Jump boost",
      "left": "Backflip",
      "right": "Frontflip"
    },
    "touch": {
      "enabled": true,
      "description": "Tap to pump, swipe to flip"
    }
  },

  "screenshots": [
    "assets/ui/screenshot1.png",
    "assets/ui/screenshot2.png",
    "assets/ui/screenshot3.png"
  ],

  "features": [
    "Procedural terrain generation",
    "Perfect landing mechanics",
    "Flow State combo system",
    "6 difficulty tiers"
  ],

  "stats": {
    "playtime": "2-5 minutes per run",
    "difficulty": "Medium",
    "replayability": "High"
  },

  "createdAt": "2026-03-01",
  "updatedAt": "2026-03-01",
  "status": "in-development"
}
```

### 2. `README.md` - Game Documentation

```markdown
# Game Name

> Brief description

## How to Play

- Controls
- Objectives
- Game mechanics

## Development

- How to run locally
- How to build
- Testing

## Credits

- Assets
- Libraries used
- AI generation details
```

### 3. `src/index.html` - Game Entry Point

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Name - CaisoGames</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script type="module" src="main.js"></script>
</body>
</html>
```

## 🎮 Game Launcher Integration

### Main Launcher Structure

```
launcher/
├── index.html              # Main launcher page (Xbox-style UI)
├── launcher.js             # Launcher logic
├── game-loader.js          # Dynamic game loading
├── styles/
│   ├── launcher.css
│   └── game-card.css
└── assets/
    ├── launcher-bg.png
    └── ui-elements/
```

### How Launcher Works

1. **Launcher scans** `/games/` directory
2. **Reads** each `game.config.json`
3. **Displays** game cards in Xbox-style grid
4. **User clicks** game card
5. **Launcher loads** game in iframe or new window
6. **Game runs** independently in its own folder

## 🚀 Development Workflow

### Creating a New Game

```bash
# 1. Use PM Agent to generate game
python3 agents/project_manager/pm_agent.py "Your game idea"

# 2. PM Agent creates folder structure
games/
└── new-game/
    ├── game.config.json  (auto-generated)
    ├── docs/
    ├── assets/
    └── src/

# 3. Art Team generates assets → saves to assets/
# 4. Code Team generates code → saves to src/
# 5. Game is ready to play from launcher
```

### Testing a Game Locally

```bash
# Option 1: Direct open
cd games/ski-caiso/src
open index.html

# Option 2: Local server
cd games/ski-caiso
python3 -m http.server 8080
# Visit http://localhost:8080/src

# Option 3: Through launcher
cd launcher
python3 -m http.server 3000
# Visit http://localhost:3000
```

### Building a Game

```bash
cd games/ski-caiso
npm install        # If game has dependencies
npm run build      # Bundles to dist/
```

## 📦 Asset Management

### Asset Naming Conventions

```
assets/
├── sprites/
│   ├── player_idle.png
│   ├── player_walk_01.png
│   ├── player_walk_02.png
│   ├── enemy_drone.png
│   └── collectible_coin.png
│
├── backgrounds/
│   ├── sky_layer_01.png
│   ├── mountains_layer_02.png
│   └── trees_layer_03.png
│
├── audio/
│   ├── sfx/
│   │   ├── jump.wav
│   │   ├── collect.wav
│   │   └── damage.wav
│   └── music/
│       └── main_theme.mp3
│
└── ui/
    ├── thumbnail.png       # 256x256 for launcher
    ├── banner.png          # 1920x400 for game page
    ├── icon.png            # 64x64 for launcher
    ├── button_play.png
    └── hud_score.png
```

### Asset Size Guidelines

- **Sprites**: Power of 2 (16x16, 32x32, 64x64, 128x128)
- **Backgrounds**: 1920x1080 or smaller
- **UI Icons**: 32x32, 64x64
- **Thumbnails**: 256x256
- **Banners**: 1920x400
- **Audio**: MP3/WAV, < 5MB per file

## 🔧 Shared vs Game-Specific Code

### ✅ Keep in Game Folder (Game-Specific)

- All game logic (`src/`)
- All game assets (`assets/`)
- Game documentation (`docs/`)
- Game configuration (`game.config.json`)
- Game-specific utilities

### ❌ DO NOT Duplicate (Use Shared)

- AI agents (`agents/`)
- Shared utilities (`packages/ai-engine/`)
- Event bus, context manager
- LLM service
- Build tools

### Example: Using Shared AI Engine

```javascript
// games/ski-caiso/src/main.js
import { Engine, Physics, Renderer } from '../../../packages/ai-engine/src/index.js';

const game = new Engine({
    canvas: document.getElementById('gameCanvas'),
    width: 800,
    height: 600
});
```

## 🎯 Benefits of This Structure

1. **Modularity**: Each game is independent
2. **Scalability**: Add unlimited games without conflicts
3. **Version Control**: Track changes per game
4. **Deployment**: Deploy specific games independently
5. **Collaboration**: Multiple devs can work on different games
6. **Maintenance**: Easy to update/remove games
7. **Testing**: Test games in isolation

## 🎨 Launcher Visual Design (Xbox-Style)

```
┌─────────────────────────────────────────────────────────┐
│  CaisoGames 🎮                              Profile ⚙️   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │          │  │          │  │          │              │
│  │ Ski      │  │ Feeding  │  │ New      │              │
│  │ Caiso    │  │ Caiso    │  │ Game     │              │
│  │          │  │          │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ⭐⭐⭐⭐⭐      ⭐⭐⭐⭐        Coming Soon              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Add      │  │          │  │          │              │
│  │ New      │  │          │  │          │              │
│  │ Game     │  │          │  │          │              │
│  │ +        │  │          │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 📚 References

- See `launcher/README.md` for launcher development
- See `docs/GAME_DEVELOPMENT_GUIDE.md` for full dev workflow
- See individual game READMEs for game-specific info

## ✅ Checklist for New Game

- [ ] Create folder: `games/<game-name>/`
- [ ] Add `game.config.json`
- [ ] Add `README.md`
- [ ] Create standard folders (docs, assets, src)
- [ ] Generate design documents
- [ ] Generate assets → save to `assets/`
- [ ] Generate code → save to `src/`
- [ ] Create thumbnail, banner, icon
- [ ] Test game independently
- [ ] Game appears in launcher automatically
- [ ] Update main README with new game entry
