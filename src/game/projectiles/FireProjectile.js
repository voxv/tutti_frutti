import { Projectile } from "./Projectile.js";

export class FireProjectile extends Projectile {
  constructor({ scene, x, y, target, damage, speed = 420, direction = { x: 1, y: 0 }, maxFruits = 10 }) {
    super({ 
      position: { x, y },
      direction: { x: 0, y: 0 }, // Don't use direction-based movement
      speed: 0, // Don't use speed-based movement
      damage,
      target,
      hitRadius: 48
    });
    this.sprite = scene.add.sprite(x, y, "fire_anim");
    this.sprite.setDisplaySize(70, 95);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDepth(2000);
    if (scene.anims && scene.anims.exists("fire_anim")) {
      this.sprite.play("fire_anim");
    }
    this.sprite.projectileRef = this;
    this._hasHit = new Set(); // Track enemies already hit to prevent double damage
    this.hasLanded = true; // Fire projectiles don't move on their own, they're animated to the road
    this.fruitsHit = 0; // Track how many fruits have been hit
    this.maxFruits = maxFruits; // Maximum fruits to damage (configurable per tower level)
  }

  onHit(enemy) {
    // Only damage if we haven't hit the max number of fruits yet
    if (enemy && typeof enemy.takeDamage === 'function' && !this._hasHit.has(enemy) && this.fruitsHit < this.maxFruits) {
      enemy.takeDamage(this.damage);
      this._hasHit.add(enemy);
      
      // Count destroyed enemy + all children that will spawn
      let fruitsDestroyed = 1; // Count the bloon itself
      if (enemy.nextTypes && Array.isArray(enemy.nextTypes)) {
        fruitsDestroyed += enemy.nextTypes.length; // Add count of children that will spawn
      }
      
      this.fruitsHit += fruitsDestroyed;
    }
  }

  update(dt) {
    // Fire projectiles are animated by tweens and don't move on their own
    // Keep position synced with sprite for collision detection
    if (this.sprite) {
      this.position.x = this.sprite.x;
      this.position.y = this.sprite.y;
    }
  }

  destroy() {
    this.isActive = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
