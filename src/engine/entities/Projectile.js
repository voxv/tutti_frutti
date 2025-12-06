import { Entity } from "./Entity.js";

export class Projectile extends Entity {
  constructor() {
    super();
    if (new.target === Projectile) throw new Error("Abstract class 'Projectile' cannot be instantiated");
    this.target = null;
    this.speed = 0;
    this.damage = 0;
  }

  update(deltaTime) { throw new Error("Abstract method 'update' must be implemented"); }
  onHit(enemy) { throw new Error("Abstract method 'onHit' must be implemented"); }
}
