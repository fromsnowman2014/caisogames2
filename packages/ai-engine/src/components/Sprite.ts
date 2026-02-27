/**
 * Sprite Component - Visual rendering data for entities
 */

import { Component } from '../core/Component';

export interface SpriteAnimation {
  /** Animation name */
  name: string;

  /** Array of frame indices */
  frames: number[];

  /** Frame duration in milliseconds */
  frameDuration: number;

  /** Whether animation loops */
  loop: boolean;
}

export class Sprite extends Component {
  /** Texture/sprite sheet source (color, image path, or asset ID) */
  texture: string = '#ffffff';

  /** Width of the sprite in pixels */
  width: number = 32;

  /** Height of the sprite in pixels */
  height: number = 32;

  /** Opacity (0.0 = transparent, 1.0 = opaque) */
  opacity: number = 1.0;

  /** Flip horizontally */
  flipX: boolean = false;

  /** Flip vertically */
  flipY: boolean = false;

  /** Available animations */
  animations: SpriteAnimation[] = [];

  /** Current animation name */
  currentAnimation: string = '';

  /** Current frame index */
  currentFrame: number = 0;

  /** Time elapsed in current frame (ms) */
  frameTime: number = 0;
}
