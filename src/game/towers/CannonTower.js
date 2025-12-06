import { ProjectileTower } from "./ProjectileTower.js";
import { BoulderProjectile } from "../projectiles/BoulderProjectile.js";

export class CannonTower extends ProjectileTower {
  constructor(config = {}) {
    let defaults = { range: 150, fireRate: 1.5, damage: 3, cost: 350, type: "cannon", homing: false };
    if (typeof window !== 'undefined' && window.towerDefaults && window.towerDefaults.cannon) {
      defaults = { ...defaults, ...window.towerDefaults.cannon };
    }
    super({
      ...defaults,
      ...config,
      type: "cannon"
    });
    this.projectileTexture = 'boulder';
    this.homing = config.homing !== undefined ? config.homing : defaults.homing;
  }

  // Override to handle cannon-specific upgrades
  applyUpgrade(upgradeKey) {
    if (upgradeKey === 'bigger_range' || upgradeKey === 'even_bigger_range') {
      this.range += 52;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'world_wide_range') {
      this.range += 200;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'rapid_barrage') {
      this.fireRate = 4; // 10 shots per second
      if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
        this._placedSprite.towerFireRate = this.fireRate;
      }
    }
    // Add more cannon-specific upgrades here
    this.upgrades.push(upgradeKey);
  }

  update(deltaTime, enemies) {
    let currentTime = Date.now() / 1000;
    // Check if any bloons are in range
    const anyInRange = enemies && enemies.some(e => e && e.isActive && this.isInRange(e));
    if (!anyInRange && this._placedSprite) {
      if (this._placedSprite.anims && this._placedSprite.anims.isPlaying) {
        this._placedSprite.anims.stop();
      }
      if (typeof this._placedSprite.setFrame === 'function') {
        this._placedSprite.setFrame(0);
      }
    }
    this.fire(enemies, currentTime);
  }

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 150;
    if (towerConfig && towerConfig.cannon && towerConfig.cannon.range) {
      range = towerConfig.cannon.range;
    }
    const tower = new CannonTower({ position: { x, y } });
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    // Use spritesheet for cannon placed sprite
    const placedSprite = scene.add.sprite(x, y, 'cannon_placed')
      .setDisplaySize(cellWidth * 0.55, cellHeight * 0.55)
      .setDepth(1001)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'cannon';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    return tower;
  }

  fire(enemies, currentTime) {
    // Always reacquire the first in-range bloon before firing
    this.acquireTarget(enemies);
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      // Play cannon placed sprite animation (4 frames)
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.anims.play('cannon_placed_anim', true);
      }
      const projConfig = projectileDefaults.boulder || { speed: 400, hitRadius: 36, sprite: 'boulder' };
      // Shift boulder 10px left from cannon center
      const startOffset = { x: this.position.x + 16, y: this.position.y - 8 };
      if (!this.target || !this.target.position) return;
      const dx = this.target.position.x - startOffset.x;
      const dy = this.target.position.y - startOffset.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dir = { x: dx / mag, y: dy / mag };
      // Determine maxHits: 3 if pop_three_fruits, 2 if pop_two_fruits, else 1
      let maxHits = 1;
      if (this.upgrades && this.upgrades.includes('pop_three_fruits')) {
        maxHits = 3;
      } else if (this.upgrades && this.upgrades.includes('pop_two_fruits')) {
        maxHits = 2;
      }
      const projectile = new BoulderProjectile({
        position: { ...startOffset },
        direction: dir,
        speed: projConfig.speed,
        damage: this.damage,
        texture: this.projectileTexture,
        target: this.target,
        hitRadius: projConfig.hitRadius,
        homing: this.homing,
        maxHits,
        showExplosion: false // CannonTower projectiles do NOT show explosion
      });
      // No custom onHit override; BoulderProjectile handles multi-hit and gold logic
      const sprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
      sprite.setDisplaySize(24, 24); // Force consistent visible size for all cannon projectiles
      sprite.setScale(0.7); // Reset scale to default
      sprite.setDepth(3001);
      projectile.sprite = sprite;
      this.projectiles.push(projectile);
      // Also push to global gameLogic.projectiles for update/render
      if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
        window.sceneRef.gameLogic.projectiles.push(projectile);
      }
    }
  }
}
