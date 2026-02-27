/**
 * @caisogames/ai-engine
 * AI-optimized game engine with Entity-Component-System architecture
 */

// Core ECS
export { Engine, EngineConfig, getEngine } from './core/Engine';
export { Entity } from './core/Entity';
export { Component, ComponentType } from './core/Component';
export { System } from './core/System';

// Built-in Components
export { Transform } from './components/Transform';
export { Sprite, SpriteAnimation } from './components/Sprite';
export { Physics, ColliderShape, Collider } from './components/Physics';
export { PlayerController } from './components/PlayerController';
export { Enemy, EnemyBehavior, PatrolPoint } from './components/Enemy';
export { Collectible, CollectibleType } from './components/Collectible';
export { Trigger, TriggerType } from './components/Trigger';

// Built-in Systems
export { MovementSystem } from './systems/MovementSystem';
export { PhysicsSystem } from './systems/PhysicsSystem';
export { CollisionSystem } from './systems/CollisionSystem';
export { RenderSystem } from './systems/RenderSystem';
export { AnimationSystem } from './systems/AnimationSystem';
