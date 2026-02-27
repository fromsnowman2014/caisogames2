/**
 * PhysicsSystem - Applies gravity and physics simulation
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { Engine } from '../core/Engine';
import { Transform } from '../components/Transform';
import { Physics } from '../components/Physics';

export class PhysicsSystem extends System {
  update(deltaTime: number, entities: Entity[]): void {
    const dt = deltaTime / 1000; // Convert to seconds
    const engine = Engine.getInstance();
    const gravity = engine.getConfig().gravity;

    // Filter entities with Transform and Physics components
    const physicsEntities = this.filterEntities(entities, Transform, Physics);

    for (const entity of physicsEntities) {
      const transform = entity.getComponent(Transform)!;
      const physics = entity.getComponent(Physics)!;

      // Skip static entities
      if (physics.isStatic) continue;

      // Apply gravity
      if (physics.useGravity) {
        physics.velocityY += gravity * dt;
      }

      // Apply friction on X axis when grounded
      if (physics.isGrounded && Math.abs(physics.velocityX) > 0) {
        const frictionForce = physics.friction * gravity * dt;
        if (Math.abs(physics.velocityX) < frictionForce) {
          physics.velocityX = 0;
        } else {
          physics.velocityX -= Math.sign(physics.velocityX) * frictionForce;
        }
      }

      // Update position based on velocity
      transform.x += physics.velocityX * dt;
      transform.y += physics.velocityY * dt;

      // Reset grounded state (will be set by collision system)
      physics.isGrounded = false;
    }
  }
}
