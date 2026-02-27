/**
 * Entity - A unique game object in the ECS architecture
 * Entities are containers for components, nothing more.
 */

import type { Component } from './Component';

export class Entity {
  public readonly id: string;
  private components: Map<string, Component> = new Map();
  private tags: Set<string> = new Set();

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Add a component to this entity
   */
  addComponent<T extends Component>(componentType: new (...args: any[]) => T, config: Partial<T>): void {
    const componentName = componentType.name;

    if (this.components.has(componentName)) {
      console.warn(`Entity ${this.id} already has component ${componentName}. Overwriting.`);
    }

    const component = new componentType();
    Object.assign(component, config);
    this.components.set(componentName, component);
  }

  /**
   * Get a component from this entity
   */
  getComponent<T extends Component>(componentType: new (...args: any[]) => T): T | null {
    const componentName = componentType.name;
    return (this.components.get(componentName) as T) || null;
  }

  /**
   * Check if entity has a component
   */
  hasComponent<T extends Component>(componentType: new (...args: any[]) => T): boolean {
    const componentName = componentType.name;
    return this.components.has(componentName);
  }

  /**
   * Remove a component from this entity
   */
  removeComponent<T extends Component>(componentType: new (...args: any[]) => T): void {
    const componentName = componentType.name;
    this.components.delete(componentName);
  }

  /**
   * Get all components
   */
  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Add a tag to this entity
   */
  addTag(tag: string): void {
    this.tags.add(tag);
  }

  /**
   * Remove a tag from this entity
   */
  removeTag(tag: string): void {
    this.tags.delete(tag);
  }

  /**
   * Check if entity has a tag
   */
  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  /**
   * Get all tags
   */
  getTags(): string[] {
    return Array.from(this.tags);
  }

  /**
   * Destroy this entity (cleanup)
   */
  destroy(): void {
    this.components.clear();
    this.tags.clear();
  }
}
