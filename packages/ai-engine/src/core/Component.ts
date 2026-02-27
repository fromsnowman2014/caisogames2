/**
 * Component - Pure data containers
 * Components should have NO logic, only data.
 * Logic belongs in Systems.
 */

export abstract class Component {
  // Base component class - all components extend this
  // Components are just data bags
}

/**
 * Type helper for component constructors
 */
export type ComponentType<T extends Component> = new (...args: any[]) => T;
