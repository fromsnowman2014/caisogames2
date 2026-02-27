/**
 * PlayerController Component - Player input and abilities
 */

import { Component } from '../core/Component';

export class PlayerController extends Component {
  /** Horizontal movement speed (pixels/second) */
  moveSpeed: number = 200;

  /** Jump force (pixels/second) */
  jumpForce: number = 400;

  /** Whether player can jump in mid-air */
  canDoubleJump: boolean = false;

  /** Whether player can wall jump */
  canWallJump: boolean = false;

  /** Whether player can dash */
  canDash: boolean = false;

  /** Dash speed (pixels/second) */
  dashSpeed: number = 500;

  /** Dash duration (milliseconds) */
  dashDuration: number = 200;

  /** Dash cooldown (milliseconds) */
  dashCooldown: number = 1000;

  /** Current dash cooldown remaining (ms) */
  dashCooldownRemaining: number = 0;

  /** Whether player is currently dashing */
  isDashing: boolean = false;

  /** Dash time remaining (ms) */
  dashTimeRemaining: number = 0;

  /** Whether player has used their double jump */
  hasUsedDoubleJump: boolean = false;

  /** Whether player is touching a wall */
  isTouchingWall: boolean = false;
}
