import { Projectile } from "./Projectile.js";

export class GlueProjectile extends Projectile {
  constructor(config) {
    super(config);
    this.slowAmount = config.slowAmount || 0.5; // 50% speed by default
    this.slowDuration = config.slowDuration || 2.5; // seconds
  }

  onHit(target) {
    if (target && typeof target.applySlow === 'function') {
      target.applySlow(this.slowAmount, this.slowDuration);
    }
    // Call base class onHit for removal, etc.
    super.onHit(target);
  }
}
