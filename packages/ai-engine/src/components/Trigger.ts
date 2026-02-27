/**
 * Trigger Component - Invisible zones that trigger events
 */

import { Component } from '../core/Component';

export type TriggerType = 'goal' | 'checkpoint' | 'hazard' | 'teleport' | 'custom';

export class Trigger extends Component {
  /** Type of trigger */
  type: TriggerType = 'custom';

  /** Whether this trigger has been activated */
  isActivated: boolean = false;

  /** Whether trigger can be activated multiple times */
  repeatable: boolean = false;

  /** Tags that can activate this trigger (e.g., ['player']) */
  activationTags: string[] = ['player'];

  /** Event name to emit when triggered */
  eventName: string = '';

  /** Custom data to pass with the event */
  eventData: Record<string, any> = {};

  /** Teleport destination (for teleport triggers) */
  teleportX?: number;
  teleportY?: number;
}
