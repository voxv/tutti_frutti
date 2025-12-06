import { Entity } from "./Entity.js";

export class Enemy extends Entity {
  constructor() {
    super();
    if (new.target === Enemy) throw new Error("Abstract class 'Enemy' cannot be instantiated");
    this.health = 0;
    this.speed = 0;
    this.progress = 0; // along path (0–1)
    this.pathId = 0;
    this.reward = 0;
  }

  update(deltaTime) { throw new Error("Abstract method 'update' must be implemented"); }
  takeDamage(amount, source) { throw new Error("Abstract method 'takeDamage' must be implemented"); }
  isAtEnd() { throw new Error("Abstract method 'isAtEnd' must be implemented"); }
}
