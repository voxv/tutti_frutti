import { Projectile } from "./Projectile.js";
import { ExplosionProjectile } from "./ExplosionProjectile.js";

export class BoulderProjectile extends Projectile {
  constructor({ position, direction, speed, damage, texture = 'boulder', target, hitRadius = 36, homing = false, maxHits = 1, showExplosion = false }) {
    super({ position, direction, speed, damage, texture, target, hitRadius, homing });
    this.maxHits = maxHits;
    this._hits = 0;
    this.showExplosion = showExplosion;
  }

  /**
   * Play explosion animation at the given position and destroy the sprite
   */
  _playExplosion(scene, x, y) {
    if (!this.showExplosion) return;
    if (scene && scene.add && scene.anims) {
      const explosion = scene.add.sprite(x, y, 'explode_anim', 0)
        .setDisplaySize(100, 100)
        .setDepth(4000);
      if (scene.anims.exists('explode_anim')) {
        try {
          explosion.play('explode_anim');
          explosion.on('animationcomplete', () => {
            explosion.destroy();
          });
        } catch (err) {
          explosion.destroy();
        }
      } else {
        explosion.destroy();
      }
    }
    try {
      if (window.sceneRef && window.sceneRef.sound && window.sceneRef.sound.play) {
        window.sceneRef.sound.play('boom');
      }
    } catch (e) {
      // Silently ignore sound errors
    }
  }

  /**
   * Called when the projectile should be destroyed on the path (not by hitting an enemy)
   * @param {Phaser.Scene} scene - The Phaser scene to play the animation in
   */
  destroyOnPath(scene) {
    this.isActive = false;
    if (this.sprite) {
      const x = this.sprite.x;
      const y = this.sprite.y;
      // Check for devastation effect (BirdTower upgrades)
      let devastationCount = 0;
      let devastationSource = null;
      if (this.sourceTower && this.sourceTower._devastationNeighbors) {
        devastationCount = this.sourceTower._devastationNeighbors;
        devastationSource = this.sourceTower;
      }
      
      // Determine explosion radius based on tower type
      let EXPLOSION_RADIUS = 120;
      if (this.isSniperDrop) {
        EXPLOSION_RADIUS = 150; // Larger radius for sniper drops
        // Even larger radius for piercing shot
        if (this.piercingShot || (this.sourceTower && this.sourceTower._piercingShot)) {
          EXPLOSION_RADIUS = 250; // Much larger radius for piercing shots
        }
      }
      
      // Damage all enemies within explosion radius
      if (scene && Array.isArray(scene.gameLogic?.enemies)) {
        const impactX = x;
        const impactY = y;
        const candidates = scene.gameLogic.enemies.filter(e => e && e.isActive && e.position);
        
        for (const e of candidates) {
          const dist = Math.hypot(e.position.x - impactX, e.position.y - impactY);
          if (dist <= EXPLOSION_RADIUS) {
            if (e && typeof e.takeDamage === 'function') {
              // For sniper drops, use the projectile's damage; for bird devastation, use 99999
              let damageAmount = this.isSniperDrop ? this.damage : 99999;
              e.takeDamage(damageAmount, devastationSource);
            } else if (e && e.health !== undefined) {
              e.health = 0;
            }
          }
        }
      }
      
      this.sprite.destroy();
      this.sprite = null;
      this._playExplosion(scene, x, y);
    }
  }

  onHit(enemy) {
    if (enemy && typeof enemy.takeDamage === 'function') {
      enemy.takeDamage(this.damage);
    }
    // Award gold if bloon is destroyed and NOT at end
    if (enemy && !enemy.isActive && !(enemy.isAtEnd && enemy.isAtEnd()) && typeof window.sceneRef === 'object' && window.sceneRef) {
      // Play squirt sound
      if (window.sceneRef.sound && window.sceneRef.sound.play) {
        window.sceneRef.sound.play('squirt');
      }
      window.sceneRef.goldAmount += enemy.reward;
      if (window.sceneRef.goldText) {
        window.sceneRef.goldText.setText(String(window.sceneRef.goldAmount));
      }
      if (typeof window.sceneRef._refreshShopAvailability === 'function') {
        window.sceneRef._refreshShopAvailability();
      }
    }
    this._hits++;
    if (this._hits >= this.maxHits) {
      this.isActive = false;
      if (this.sprite) {
        const x = this.sprite.x;
        const y = this.sprite.y;
        this.sprite.destroy();
        this.sprite = null;
        // Play explosion at hit position for BirdTower projectiles
        if (this.sourceTower && this.sourceTower.towerType === 'bird') {
          const explosionProjectile = new ExplosionProjectile({
            position: { x, y },
            damage: 0,
            sourceTower: this.sourceTower
          });
          explosionProjectile.playExplosion(window.sceneRef);
        } else {
          this._playExplosion(window.sceneRef, x, y);
        }
      }
    }
    // Otherwise, projectile continues
  }
}
