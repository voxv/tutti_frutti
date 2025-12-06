import { Vector2 } from "../core/Vector2.js";

export class Entity {
  constructor() {
    if (new.target === Entity) throw new Error("Abstract class 'Entity' cannot be instantiated");
    this.position = new Vector2();
    this.isActive = true;
  }

  update(deltaTime) {
    throw new Error("Abstract method 'update' must be implemented");
  }
}