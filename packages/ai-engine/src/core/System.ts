/**
 * System - Contains logic that operates on entities with specific components
 * Systems are where all the game logic lives.
 */

import type { Entity } from './Entity';

export abstract class System {
  /**
   * Update the system
   * @param deltaTime - Time since last frame in milliseconds
   * @param entities - All entities in the game
   */
  abstract update(deltaTime: number, entities: Entity[]): void;

  /**
   * Optional: Initialize the system
   */
  init?(): void;

  /**
   * Optional: Cleanup the system
   */
  destroy?(): void;

  /**
   * Helper: Filter entities that have all required components
   */
  protected filterEntities(entities: Entity[], ...componentTypes: any[]): Entity[] {
    return entities.filter(entity =>
      componentTypes.every(type => entity.hasComponent(type))
    );
  }
}
