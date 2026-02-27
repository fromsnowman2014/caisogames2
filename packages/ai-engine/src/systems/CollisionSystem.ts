/**
 * CollisionSystem - Detects and resolves collisions between entities
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { Transform } from '../components/Transform';
import { Physics } from '../components/Physics';

interface CollisionResult {
  entity1: Entity;
  entity2: Entity;
  overlap: { x: number; y: number };
}

export class CollisionSystem extends System {
  update(deltaTime: number, entities: Entity[]): void {
    const physicsEntities = this.filterEntities(entities, Transform, Physics);

    // Broad phase: check all pairs
    const collisions: CollisionResult[] = [];

    for (let i = 0; i < physicsEntities.length; i++) {
      for (let j = i + 1; j < physicsEntities.length; j++) {
        const entity1 = physicsEntities[i];
        const entity2 = physicsEntities[j];

        const collision = this.checkCollision(entity1, entity2);
        if (collision) {
          collisions.push(collision);
        }
      }
    }

    // Resolve collisions
    for (const collision of collisions) {
      this.resolveCollision(collision);
    }
  }

  private checkCollision(entity1: Entity, entity2: Entity): CollisionResult | null {
    const transform1 = entity1.getComponent(Transform)!;
    const physics1 = entity1.getComponent(Physics)!;
    const transform2 = entity2.getComponent(Transform)!;
    const physics2 = entity2.getComponent(Physics)!;

    const collider1 = physics1.collider;
    const collider2 = physics2.collider;

    // Box-Box collision (AABB)
    if (collider1.shape === 'box' && collider2.shape === 'box') {
      const x1 = transform1.x + collider1.offsetX;
      const y1 = transform1.y + collider1.offsetY;
      const x2 = transform2.x + collider2.offsetX;
      const y2 = transform2.y + collider2.offsetY;

      const overlapX = Math.min(x1 + collider1.width, x2 + collider2.width) -
                       Math.max(x1, x2);
      const overlapY = Math.min(y1 + collider1.height, y2 + collider2.height) -
                       Math.max(y1, y2);

      if (overlapX > 0 && overlapY > 0) {
        return {
          entity1,
          entity2,
          overlap: { x: overlapX, y: overlapY },
        };
      }
    }

    // Circle-Circle collision
    if (collider1.shape === 'circle' && collider2.shape === 'circle') {
      const x1 = transform1.x + collider1.offsetX;
      const y1 = transform1.y + collider1.offsetY;
      const x2 = transform2.x + collider2.offsetX;
      const y2 = transform2.y + collider2.offsetY;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radiusSum = collider1.width + collider2.width; // width = radius for circles

      if (distance < radiusSum) {
        const overlap = radiusSum - distance;
        return {
          entity1,
          entity2,
          overlap: { x: overlap, y: overlap },
        };
      }
    }

    return null;
  }

  private resolveCollision(collision: CollisionResult): void {
    const { entity1, entity2, overlap } = collision;

    const physics1 = entity1.getComponent(Physics)!;
    const physics2 = entity2.getComponent(Physics)!;
    const transform1 = entity1.getComponent(Transform)!;
    const transform2 = entity2.getComponent(Transform)!;

    // If either collider is a trigger, don't resolve physics
    if (physics1.collider.isTrigger || physics2.collider.isTrigger) {
      // TODO: Emit trigger events
      return;
    }

    // Determine collision normal (simpler approach: separate on smallest overlap axis)
    const separateOnX = overlap.x < overlap.y;

    if (separateOnX) {
      // Separate horizontally
      const direction = transform1.x < transform2.x ? -1 : 1;

      if (!physics1.isStatic && !physics2.isStatic) {
        // Both dynamic: share separation
        transform1.x += direction * overlap.x * 0.5;
        transform2.x -= direction * overlap.x * 0.5;

        // Exchange velocities (simple elastic collision)
        const tempVelX = physics1.velocityX;
        physics1.velocityX = physics2.velocityX * physics1.bounciness;
        physics2.velocityX = tempVelX * physics2.bounciness;
      } else if (physics1.isStatic) {
        // Only entity2 moves
        transform2.x -= direction * overlap.x;
        physics2.velocityX = -physics2.velocityX * physics2.bounciness;
      } else {
        // Only entity1 moves
        transform1.x += direction * overlap.x;
        physics1.velocityX = -physics1.velocityX * physics1.bounciness;
      }
    } else {
      // Separate vertically
      const direction = transform1.y < transform2.y ? -1 : 1;

      if (!physics1.isStatic && !physics2.isStatic) {
        // Both dynamic: share separation
        transform1.y += direction * overlap.y * 0.5;
        transform2.y -= direction * overlap.y * 0.5;

        // Exchange velocities
        const tempVelY = physics1.velocityY;
        physics1.velocityY = physics2.velocityY * physics1.bounciness;
        physics2.velocityY = tempVelY * physics2.bounciness;

        // Set grounded if entity is on top
        if (direction < 0) {
          physics1.isGrounded = true;
        } else {
          physics2.isGrounded = true;
        }
      } else if (physics1.isStatic) {
        // Only entity2 moves
        transform2.y -= direction * overlap.y;
        physics2.velocityY = -physics2.velocityY * physics2.bounciness;

        if (direction > 0) {
          physics2.isGrounded = true;
        }
      } else {
        // Only entity1 moves
        transform1.y += direction * overlap.y;
        physics1.velocityY = -physics1.velocityY * physics1.bounciness;

        if (direction < 0) {
          physics1.isGrounded = true;
        }
      }
    }
  }
}
