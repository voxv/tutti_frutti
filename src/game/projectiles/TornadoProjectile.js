import { Projectile } from "./Projectile.js";

export class TornadoProjectile extends Projectile {
  constructor(config = {}) {
    super(config);
    this.projectileType = 'tornado';
    this.homing = config.homing !== undefined ? config.homing : true;
    this.homingStrength = config.homingStrength || 0.1; // How quickly it adjusts toward target
    this.sprite = null;
    this.maxHits = config.maxHits || 1;
    this._hitEnemies = new Set();
    this._homingDisabled = false; // Disable homing after first hit
    this._collisionDisabled = false; // Disable collision detection after maxHits reached
  }

  update(deltaTime) {
    if (!this.isActive) return;
    // If homing is not disabled and we haven't hit any fruit, use homing
    if (!this._homingDisabled && this.homing && this._hitEnemies.size === 0) {
      super.update(deltaTime);
    } else {
      // After first hit, move in a straight line (no homing, no retargeting)
      this.position.x += this.direction.x * this.speed * deltaTime;
      this.position.y += this.direction.y * this.speed * deltaTime;
      if (this.sprite) {
        this.sprite.x = this.position.x;
        this.sprite.y = this.position.y;
      }
      // Check for off-screen
      if (this.position.x > 1300 || this.position.x < 0) {
        this.isActive = false;
        if (this.sprite) {
          this.sprite.destroy();
          this.sprite = null;
        }
      }
    }
    // Check for hits
    this.checkCollisions();
  }

  checkCollisions() {
    if (!this.sprite || !this.sprite.active) return;
    if (this._collisionDisabled) return;
    // Check all active enemies in the scene
    const scene = typeof window !== 'undefined' ? window.sceneRef : null;
    const enemies = scene && scene.gameLogic && Array.isArray(scene.gameLogic.enemies) ? scene.gameLogic.enemies : [];
    for (const enemy of enemies) {
      if (!enemy || !enemy.isActive || !enemy.position) continue;
      if (this._hitEnemies.has(enemy)) continue;
      const dist = Math.hypot(enemy.position.x - this.sprite.x, enemy.position.y - this.sprite.y);
      if (dist <= (this.hitRadius || 60)) {
        this.onHit(enemy);
        if (this._hitEnemies.size >= this.maxHits) {
          this._collisionDisabled = true;
          return;
        }
      }
    }
  }

  onHit(enemy) {
    // Only apply knockback if not already hit or if not a boss
    if (!enemy || this._hitEnemies.has(enemy) || this._collisionDisabled) return;
    // If boss, immediately deactivate and destroy the tornado
    if (enemy.type === 'boss' || enemy.constructor?.name === 'BossBloon') {
      this.isActive = false;
      if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
      this._collisionDisabled = true;
      return;
    }
    this._hitEnemies.add(enemy);
    if (enemy && typeof enemy.knockback === 'function') {
      enemy.knockback(0.6, 3); // 0.7s, 4x speed backward
    }
    // If we have more hits left, re-enable homing and set a new target
    if (this._hitEnemies.size < this.maxHits) {
      // Find the next closest valid enemy
      const scene = typeof window !== 'undefined' ? window.sceneRef : null;
      const enemies = scene && scene.gameLogic && Array.isArray(scene.gameLogic.enemies) ? scene.gameLogic.enemies : [];
      let closest = null;
      let minDist = Infinity;
      for (const e of enemies) {
        if (!e || !e.isActive || !e.position || this._hitEnemies.has(e)) continue;
        const dist = Math.hypot(e.position.x - this.position.x, e.position.y - this.position.y);
        if (dist < minDist) {
          minDist = dist;
          closest = e;
        }
      }
      if (closest) {
        this.target = closest;
        this._homingDisabled = false;
      } else {
        this._homingDisabled = true;
      }
    } else {
      // After last hit, disable homing
      this._homingDisabled = true;
    }
  }
}

