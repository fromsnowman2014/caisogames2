/**
 * Engine - The core game engine managing entities, systems, and the game loop
 * This is the main entry point for the AI-optimized game engine.
 */

import { Entity } from './Entity';
import { System } from './System';

export interface EngineConfig {
  canvas: string | HTMLCanvasElement;
  width: number;
  height: number;
  targetFPS?: number;
  backgroundColor?: string;
  gravity?: number;
  debug?: boolean;
}

export class Engine {
  private static instance: Engine | null = null;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: Required<EngineConfig>;

  private entities: Map<string, Entity> = new Map();
  private systems: System[] = [];

  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  private constructor(config: EngineConfig) {
    // Get or create canvas
    if (typeof config.canvas === 'string') {
      const canvasElement = document.querySelector(config.canvas);
      if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas not found: ${config.canvas}`);
      }
      this.canvas = canvasElement;
    } else {
      this.canvas = config.canvas;
    }

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = context;

    // Set config with defaults
    this.config = {
      canvas: this.canvas,
      width: config.width,
      height: config.height,
      targetFPS: config.targetFPS || 60,
      backgroundColor: config.backgroundColor || '#000000',
      gravity: config.gravity !== undefined ? config.gravity : 980,
      debug: config.debug || false,
    };

    // Set canvas size
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
  }

  /**
   * Initialize the engine (singleton pattern)
   */
  static async init(config: EngineConfig): Promise<Engine> {
    if (Engine.instance) {
      console.warn('Engine already initialized. Returning existing instance.');
      return Engine.instance;
    }

    Engine.instance = new Engine(config);
    console.log('✅ Engine initialized:', config);
    return Engine.instance;
  }

  /**
   * Get the engine instance
   */
  static getInstance(): Engine {
    if (!Engine.instance) {
      throw new Error('Engine not initialized. Call Engine.init() first.');
    }
    return Engine.instance;
  }

  /**
   * Create a new entity
   */
  createEntity(id: string): Entity {
    if (this.entities.has(id)) {
      console.warn(`Entity ${id} already exists. Overwriting.`);
    }

    const entity = new Entity(id);
    this.entities.set(id, entity);
    return entity;
  }

  /**
   * Get an entity by ID
   */
  getEntity(id: string): Entity | null {
    return this.entities.get(id) || null;
  }

  /**
   * Get entities by tag
   */
  getEntitiesByTag(tag: string): Entity[] {
    return Array.from(this.entities.values()).filter(entity => entity.hasTag(tag));
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Destroy an entity
   */
  destroyEntity(id: string): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.destroy();
      this.entities.delete(id);
    }
  }

  /**
   * Register a system
   */
  registerSystem(system: System): void {
    if (system.init) {
      system.init();
    }
    this.systems.push(system);
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Engine already running.');
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
    console.log('🎮 Engine started');
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false;
    console.log('⏸️  Engine stopped');
  }

  /**
   * Main game loop
   */
  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update FPS counter
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / deltaTime);
    }

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.config.width, this.config.height);

    // Update all systems
    const entities = this.getAllEntities();
    for (const system of this.systems) {
      system.update(deltaTime, entities);
    }

    // Debug info
    if (this.config.debug) {
      this.renderDebugInfo();
    }

    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(): void {
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    this.ctx.fillText(`Entities: ${this.entities.size}`, 10, 40);
    this.ctx.fillText(`Systems: ${this.systems.length}`, 10, 60);
  }

  /**
   * Get engine configuration
   */
  getConfig(): Required<EngineConfig> {
    return this.config;
  }

  /**
   * Get canvas context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Cleanup and destroy the engine
   */
  destroy(): void {
    this.stop();

    // Destroy all systems
    for (const system of this.systems) {
      if (system.destroy) {
        system.destroy();
      }
    }

    // Destroy all entities
    for (const entity of this.entities.values()) {
      entity.destroy();
    }

    this.entities.clear();
    this.systems = [];
    Engine.instance = null;

    console.log('🗑️  Engine destroyed');
  }
}

// Export singleton getter for convenience
export const getEngine = () => Engine.getInstance();
