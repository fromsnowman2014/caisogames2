/**
 * RenderSystem - Renders sprites to the canvas
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { Engine } from '../core/Engine';
import { Transform } from '../components/Transform';
import { Sprite } from '../components/Sprite';

export class RenderSystem extends System {
  update(deltaTime: number, entities: Entity[]): void {
    const engine = Engine.getInstance();
    const ctx = engine.getContext();

    // Filter entities with Transform and Sprite
    const renderableEntities = this.filterEntities(entities, Transform, Sprite);

    // Sort by zIndex (lower values render first, higher values on top)
    renderableEntities.sort((a, b) => {
      const transformA = a.getComponent(Transform)!;
      const transformB = b.getComponent(Transform)!;
      return transformA.zIndex - transformB.zIndex;
    });

    // Render each entity
    for (const entity of renderableEntities) {
      const transform = entity.getComponent(Transform)!;
      const sprite = entity.getComponent(Sprite)!;

      // Skip if fully transparent
      if (sprite.opacity <= 0) continue;

      ctx.save();

      // Apply transform
      ctx.translate(transform.x, transform.y);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(
        transform.scale * (sprite.flipX ? -1 : 1),
        transform.scale * (sprite.flipY ? -1 : 1)
      );
      ctx.globalAlpha = sprite.opacity;

      // Render based on texture type
      if (sprite.texture.startsWith('#')) {
        // Solid color
        ctx.fillStyle = sprite.texture;
        ctx.fillRect(
          -sprite.width / 2,
          -sprite.height / 2,
          sprite.width,
          sprite.height
        );
      } else {
        // TODO: Implement image/sprite sheet rendering
        // For now, render a placeholder
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(
          -sprite.width / 2,
          -sprite.height / 2,
          sprite.width,
          sprite.height
        );
      }

      ctx.restore();
    }
  }
}
