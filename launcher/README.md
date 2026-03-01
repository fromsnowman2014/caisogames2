# CaisoGames Launcher

Xbox-style game launcher for CaisoGames V2 platform.

## 🎮 Features

- **Dynamic Game Discovery**: Automatically loads all games from `/games/` directory
- **Xbox-Style UI**: Modern, dark-themed interface inspired by Xbox dashboard
- **Filter & Search**: Filter games by status (Playable, In Development, Coming Soon)
- **Game Details**: View complete game information, controls, and features
- **One-Click Launch**: Play games directly from the launcher
- **AI Game Creation**: Integrated PM Agent for creating new games

## 🚀 Quick Start

### Option 1: Direct File Open

```bash
cd launcher
open index.html
```

### Option 2: Local Server (Recommended)

```bash
cd launcher
python3 -m http.server 3000
```

Then visit: http://localhost:3000

### Option 3: Live Server (VS Code)

1. Install "Live Server" extension
2. Right-click `launcher/index.html`
3. Select "Open with Live Server"

## 📁 Project Structure

```
launcher/
├── index.html              # Main launcher page
├── README.md               # This file
│
├── js/
│   ├── launcher.js         # Main application logic
│   └── game-loader.js      # Game discovery and loading
│
├── styles/
│   ├── launcher.css        # Main layout and UI
│   └── game-card.css       # Game card components
│
└── assets/
    └── ui/
        └── (launcher assets)
```

## 🎯 How It Works

### 1. Game Discovery

The launcher scans `/games/` directory and loads `game.config.json` from each game:

```javascript
// Discovers games
const gameIds = ['ski-caiso', 'feeding-caiso', ...];

// Loads each config
const config = await fetch('../games/ski-caiso/game.config.json');
```

### 2. Dynamic Rendering

Each game is rendered as a card with:
- Thumbnail image
- Status badge (Playable / In Development / Coming Soon)
- Description and genre
- Tags and features
- Stats (playtime, difficulty, replayability)
- Action buttons (Play, Details)

### 3. Game Launch

When user clicks "Play":

```javascript
const gameUrl = '../games/ski-caiso/src/index.html';
window.open(gameUrl, 'game_ski-caiso', 'width=800,height=600');
```

## 🎨 Customization

### Adding a New Game

1. Create game folder: `games/new-game/`
2. Add `game.config.json` (see template below)
3. Launcher automatically discovers it on refresh

### Game Config Template

```json
{
  "id": "my-game",
  "name": "My Awesome Game",
  "version": "1.0.0",
  "description": "Game description",
  "genre": "Platformer",
  "status": "playable",
  "entryPoint": "src/index.html",
  "tags": ["fun", "2d"],
  "features": ["Feature 1", "Feature 2"],
  "stats": {
    "playtime": "5-10 minutes",
    "difficulty": "Medium",
    "replayability": "High"
  }
}
```

### Styling

Edit CSS variables in `styles/launcher.css`:

```css
:root {
    --accent-green: #0faf5c;
    --accent-blue: #4d9fff;
    --bg-primary: #0e0e10;
    /* ... */
}
```

## 🔧 Development

### Debugging

Open browser console (F12) to see:
- Game discovery logs
- Configuration loading errors
- Launch events

### Testing New Games

1. Add game to `/games/` directory
2. Create `game.config.json`
3. Refresh launcher
4. Game appears automatically

### Production Build

For production deployment:

```bash
# Build all games
npm run build:games

# Or build specific game
cd games/ski-caiso
npm run build
```

## 📊 Game Status Types

- **`playable`**: Game is complete and ready to play
- **`in-development`**: Game is being developed (show "In Development" badge)
- **`coming-soon`**: Game is planned but not started (show "Coming Soon" badge)

## 🎮 Keyboard Shortcuts

- `F5`: Refresh game list
- `Esc`: Close modals
- `Tab`: Navigate between games

## 🌐 Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## 🐛 Troubleshooting

### Games not loading?

- Check browser console for errors
- Ensure `game.config.json` exists in each game folder
- Verify JSON syntax is valid

### Game won't launch?

- Check `entryPoint` path in config
- Ensure game's `index.html` exists
- Try opening game directly: `games/<game-id>/src/index.html`

### Styling issues?

- Clear browser cache (Ctrl+Shift+R)
- Check CSS file paths
- Verify no conflicting styles

## 🚀 Future Features

- [ ] Search functionality
- [ ] Game ratings and reviews
- [ ] Achievement tracking
- [ ] Cloud save integration
- [ ] Multiplayer lobby
- [ ] Screenshot gallery
- [ ] Leaderboards

## 📝 API Integration

### Creating Games via PM Agent

```javascript
// Future API endpoint
POST /api/pm-agent/create-game
{
  "gameIdea": "A platformer about...",
  "genre": "platformer"
}

// Returns:
{
  "gameId": "new-game",
  "status": "processing",
  "estimatedTime": "5-10 minutes"
}
```

## 🤝 Contributing

To add a new feature to the launcher:

1. Fork the repository
2. Create feature branch
3. Make changes to launcher files
4. Test with multiple games
5. Submit pull request

## 📄 License

Part of CaisoGames V2 project.

## 🙏 Credits

- Design: Claude Sonnet 4.5
- Inspiration: Xbox Game Pass interface
- Icons: Unicode emoji (for simplicity)
