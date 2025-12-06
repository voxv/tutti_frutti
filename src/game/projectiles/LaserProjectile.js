import { Projectile } from "./Projectile.js";

export class LaserProjectile extends Projectile {
  constructor(config = {}) {
    super({
      ...config,
      sprite: config.sprite || 'laser_anim',
      frameCount: 4,
      frameWidth: 180,
      frameHeight: 45
    });
  }
}
