/**
 * AnimationSystem - Updates sprite animations
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { Sprite } from '../components/Sprite';

export class AnimationSystem extends System {
  update(deltaTime: number, entities: Entity[]): void {
    // Filter entities with Sprite component
    const animatedEntities = this.filterEntities(entities, Sprite);

    for (const entity of animatedEntities) {
      const sprite = entity.getComponent(Sprite)!;

      // Skip if no animation is playing
      if (!sprite.currentAnimation) continue;

      // Find the current animation
      const animation = sprite.animations.find(
        (anim) => anim.name === sprite.currentAnimation
      );

      if (!animation) continue;

      // Update frame time
      sprite.frameTime += deltaTime;

      // Check if it's time to advance to the next frame
      if (sprite.frameTime >= animation.frameDuration) {
        sprite.frameTime -= animation.frameDuration;
        sprite.currentFrame++;

        // Handle animation looping
        if (sprite.currentFrame >= animation.frames.length) {
          if (animation.loop) {
            sprite.currentFrame = 0;
          } else {
            // Animation finished, stay on last frame
            sprite.currentFrame = animation.frames.length - 1;
          }
        }
      }
    }
  }
}
