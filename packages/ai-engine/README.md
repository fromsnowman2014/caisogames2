# @caisogames/ai-engine

AI-optimized 2D game engine built with Entity-Component-System (ECS) architecture.

## Features

- **Simple ECS Architecture**: Clean separation between data (Components) and logic (Systems)
- **Built-in Components**: Transform, Sprite, Physics, PlayerController, Enemy, Collectible, Trigger
- **Built-in Systems**: Movement, Physics, Collision, Render, Animation
- **TypeScript**: Fully typed for better developer experience
- **AI-Friendly**: Designed to be easy for AI agents to generate game code

## Installation

```bash
npm install @caisogames/ai-engine
```

## Quick Start

```typescript
import {
  Engine,
  Transform,
  Sprite,
  Physics,
  RenderSystem,
  PhysicsSystem,
} from '@caisogames/ai-engine';

// Initialize engine
const engine = await Engine.init({
  canvas: '#gameCanvas',
  width: 800,
  height: 600,
  targetFPS: 60,
  backgroundColor: '#1a1a1a',
  gravity: 980,
  debug: true,
});

// Create a player entity
const player = engine.createEntity('player');
player.addComponent(Transform, { x: 100, y: 100 });
player.addComponent(Sprite, { texture: '#00ff00', width: 32, height: 32 });
player.addComponent(Physics, {
  collider: { shape: 'box', width: 32, height: 32, offsetX: -16, offsetY: -16 }
});
player.addTag('player');

// Register systems
engine.registerSystem(new PhysicsSystem());
engine.registerSystem(new RenderSystem());

// Start game loop
engine.start();
```

## Architecture

### Entity
Entities are containers for components. They have:
- Unique ID
- Component map
- Tag system for grouping

### Component
Components are pure data containers with NO logic:
- `Transform`: Position, scale, rotation, zIndex
- `Sprite`: Visual rendering data
- `Physics`: Velocity, gravity, collision
- `PlayerController`: Input handling data
- `Enemy`: AI behavior data
- `Collectible`: Pickup items
- `Trigger`: Event zones

### System
Systems contain ALL game logic and operate on entities:
- `MovementSystem`: Handles player input
- `PhysicsSystem`: Applies gravity and velocity
- `CollisionSystem`: Detects and resolves collisions
- `RenderSystem`: Draws sprites to canvas
- `AnimationSystem`: Updates sprite animations

## Example

See `examples/simple-platformer.html` for a working demo.

## Building

```bash
npm run build
```

## License

MIT
