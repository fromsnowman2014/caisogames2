/**
 * Transform Component - Position, scale, and rotation in 2D space
 */

import { Component } from '../core/Component';

export class Transform extends Component {
  /** X position in pixels */
  x: number = 0;

  /** Y position in pixels */
  y: number = 0;

  /** Scale factor (1.0 = normal size) */
  scale: number = 1.0;

  /** Rotation in degrees (0-360) */
  rotation: number = 0;

  /** Z-index for rendering order (higher = drawn on top) */
  zIndex: number = 0;
}
