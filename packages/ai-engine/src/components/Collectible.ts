/**
 * Collectible Component - Items that can be picked up by the player
 */

import { Component } from '../core/Component';

export type CollectibleType = 'coin' | 'powerup' | 'health' | 'key' | 'custom';

export class Collectible extends Component {
  /** Type of collectible */
  type: CollectibleType = 'coin';

  /** Point value */
  value: number = 1;

  /** Whether this collectible has been collected */
  isCollected: boolean = false;

  /** Whether to respawn after being collected */
  respawns: boolean = false;

  /** Respawn time in milliseconds */
  respawnTime: number = 5000;

  /** Time until respawn (ms) */
  respawnTimeRemaining: number = 0;

  /** Custom data for special collectibles */
  customData: Record<string, any> = {};
}
