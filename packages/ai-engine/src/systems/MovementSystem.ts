/**
 * MovementSystem - Handles player input and movement
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { Transform } from '../components/Transform';
import { Physics } from '../components/Physics';
import { PlayerController } from '../components/PlayerController';

export class MovementSystem extends System {
  private keys: Set<string> = new Set();

  init(): void {
    // Listen for keyboard input
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
      window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    }
  }

  update(deltaTime: number, entities: Entity[]): void {
    const dt = deltaTime / 1000; // Convert to seconds

    // Filter entities with Transform, Physics, and PlayerController
    const players = this.filterEntities(entities, Transform, Physics, PlayerController);

    for (const player of players) {
      const transform = player.getComponent(Transform)!;
      const physics = player.getComponent(Physics)!;
      const controller = player.getComponent(PlayerController)!;

      // Handle dash cooldown
      if (controller.dashCooldownRemaining > 0) {
        controller.dashCooldownRemaining = Math.max(0, controller.dashCooldownRemaining - deltaTime);
      }

      // Handle dashing
      if (controller.isDashing) {
        controller.dashTimeRemaining = Math.max(0, controller.dashTimeRemaining - deltaTime);
        if (controller.dashTimeRemaining <= 0) {
          controller.isDashing = false;
        } else {
          // Continue dash movement (handled by velocity set when dash started)
          continue;
        }
      }

      // Horizontal movement
      let targetVelocityX = 0;
      if (this.keys.has('a') || this.keys.has('arrowleft')) {
        targetVelocityX = -controller.moveSpeed;
      }
      if (this.keys.has('d') || this.keys.has('arrowright')) {
        targetVelocityX = controller.moveSpeed;
      }

      // Apply movement
      if (!controller.isDashing) {
        physics.velocityX = targetVelocityX;
      }

      // Jump
      if ((this.keys.has('w') || this.keys.has('arrowup') || this.keys.has(' ')) && !controller.isDashing) {
        if (physics.isGrounded) {
          physics.velocityY = -controller.jumpForce;
          controller.hasUsedDoubleJump = false;
        } else if (controller.canDoubleJump && !controller.hasUsedDoubleJump) {
          physics.velocityY = -controller.jumpForce;
          controller.hasUsedDoubleJump = true;
        } else if (controller.canWallJump && controller.isTouchingWall) {
          physics.velocityY = -controller.jumpForce;
          // Add horizontal boost away from wall
          physics.velocityX = controller.isTouchingWall ? controller.moveSpeed * 1.5 : 0;
        }
      }

      // Dash
      if (this.keys.has('shift') && controller.canDash &&
          !controller.isDashing && controller.dashCooldownRemaining <= 0) {
        controller.isDashing = true;
        controller.dashTimeRemaining = controller.dashDuration;
        controller.dashCooldownRemaining = controller.dashCooldown;

        // Set dash velocity based on current direction
        const dashDirection = physics.velocityX >= 0 ? 1 : -1;
        physics.velocityX = dashDirection * controller.dashSpeed;
      }
    }
  }

  destroy(): void {
    // Clean up event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
      window.removeEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    }
  }
}
