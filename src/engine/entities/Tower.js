import { Entity } from "./Entity.js";

export class Tower extends Entity {
  constructor() {
    super();
    if (new.target === Tower) throw new Error("Abstract class 'Tower' cannot be instantiated");
    this.range = 100;
    this.cooldown = 1.0;
    this.currentCooldown = 0;
    this.level = 1;
  }

  update(deltaTime, enemies) { throw new Error("Abstract method 'update' must be implemented"); }
  attack(targets) { throw new Error("Abstract method 'attack' must be implemented"); }
  upgrade() { throw new Error("Abstract method 'upgrade' must be implemented"); }
  inRange(enemy) { throw new Error("Abstract method 'inRange' must be implemented"); }
}
