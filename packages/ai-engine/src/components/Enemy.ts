/**
 * Enemy Component - AI behavior and patrol data
 */

import { Component } from '../core/Component';

export type EnemyBehavior = 'patrol' | 'chase' | 'stationary' | 'flying';

export interface PatrolPoint {
  x: number;
  y: number;
}

export class Enemy extends Component {
  /** AI behavior type */
  behavior: EnemyBehavior = 'patrol';

  /** Movement speed (pixels/second) */
  moveSpeed: number = 100;

  /** Detection range for player (pixels) */
  detectionRange: number = 150;

  /** Attack range (pixels) */
  attackRange: number = 50;

  /** Attack damage */
  attackDamage: number = 1;

  /** Attack cooldown (milliseconds) */
  attackCooldown: number = 1000;

  /** Attack cooldown remaining (ms) */
  attackCooldownRemaining: number = 0;

  /** Health points */
  health: number = 3;

  /** Max health */
  maxHealth: number = 3;

  /** Patrol points for patrol behavior */
  patrolPoints: PatrolPoint[] = [];

  /** Current patrol point index */
  currentPatrolIndex: number = 0;

  /** Direction of patrol (-1 = left, 1 = right) */
  patrolDirection: number = 1;

  /** Whether enemy is currently chasing player */
  isChasing: boolean = false;
}
