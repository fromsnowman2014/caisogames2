/**
 * Physics Component - Velocity, forces, and collision data
 */

import { Component } from '../core/Component';

export type ColliderShape = 'box' | 'circle';

export interface Collider {
  /** Shape type */
  shape: ColliderShape;

  /** Width (for box) or radius (for circle) */
  width: number;

  /** Height (for box, ignored for circle) */
  height: number;

  /** Offset from entity position */
  offsetX: number;
  offsetY: number;

  /** Whether this collider is a trigger (no physical collision) */
  isTrigger: boolean;
}

export class Physics extends Component {
  /** Velocity in X direction (pixels/second) */
  velocityX: number = 0;

  /** Velocity in Y direction (pixels/second) */
  velocityY: number = 0;

  /** Whether gravity affects this entity */
  useGravity: boolean = true;

  /** Friction coefficient (0.0 = no friction, 1.0 = full friction) */
  friction: number = 0.8;

  /** Bounce/restitution coefficient (0.0 = no bounce, 1.0 = full bounce) */
  bounciness: number = 0.0;

  /** Mass of the entity (affects collision response) */
  mass: number = 1.0;

  /** Whether this entity is static (immovable) */
  isStatic: boolean = false;

  /** Collider definition */
  collider: Collider = {
    shape: 'box',
    width: 32,
    height: 32,
    offsetX: 0,
    offsetY: 0,
    isTrigger: false,
  };

  /** Whether entity is currently on the ground */
  isGrounded: boolean = false;
}
