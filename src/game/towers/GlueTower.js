import { ProjectileTower } from "./ProjectileTower.js";
import towerDefaults from "./tower.json";

import projectileDefaults from "../projectiles.json";
import { GlueProjectile } from "../projectiles/GlueProjectile.js";
import { GAME_SCALE } from "../../client/utils/scaleConfig.js";

export class GlueTower extends ProjectileTower {
  constructor(config = {}) {
    let defaults = { range: 130, fireRate: 1.2, damage: 0, cost: 280, type: "glue", homing: false };
    if (towerDefaults && towerDefaults.glue) {
      defaults = { ...defaults, ...towerDefaults.glue };
    }
    super({
      ...defaults,
      ...config,
      type: "glue"
    });
    this.projectileTexture = 'glue_projectile';
    this.homing = config.homing !== undefined ? config.homing : defaults.homing;
    this.stickinessLevel = 0; // 0 = no spread, 1 = spreads to 1 bloon, 2 = spreads to 2 bloons, 3 = spreads to 3 bloons
    this.lastTarget = null; // Track last targeted bloon to avoid targeting same one twice
  }

  // Override to handle glue-specific upgrades
  applyUpgrade(upgradeKey) {
    if (upgradeKey === 'bigger_range' || upgradeKey === 'even_bigger_range') {
      this.range += 50;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'super_glue') {
      this.range = 500;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'fast_shooting') {
      this.fireRate = 2.0;
      if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
        this._placedSprite.towerFireRate = this.fireRate;
      }
    } else if (upgradeKey === 'more_stickiness_1') {
      this.stickinessLevel = Math.max(this.stickinessLevel, 1);
    } else if (upgradeKey === 'more_stickiness_2') {
      this.stickinessLevel = Math.max(this.stickinessLevel, 2);
    } else if (upgradeKey === 'more_stickiness_3') {
      this.stickinessLevel = Math.max(this.stickinessLevel, 5); // Increased to 5 for more spread
    }
    // Add more glue-specific upgrades here
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

  acquireTarget(enemies) {
    // Use base ProjectileTower targeting logic
    super.acquireTarget(enemies);
    // Only for 'First' priority, try to avoid last target if possible
    if (
      this.targetingPriority === 'First' &&
      this.lastTarget &&
      this.target === this.lastTarget &&
      enemies && Array.isArray(enemies)
    ) {
      // Get all in-range enemies
      const inRange = enemies.filter(e => e && e.isActive && this.isInRange(e));
      if (inRange.length > 1) {
        const alt = inRange.find(e => e !== this.lastTarget);
        if (alt) this.target = alt;
      }
    }
  }

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 130;
    if (towerConfig && towerConfig.glue && towerConfig.glue.range) {
      range = towerConfig.glue.range;
    }
    const tower = new GlueTower({ position: { x, y } });
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    // Use spritesheet for glue placed sprite
    const placedSprite = scene.add.sprite(x, y, 'glue_placed')
      .setDisplaySize(cellWidth * 0.6, cellHeight * 0.6)
      .setDepth(8500)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'glue';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    return tower;
  }

  fire(enemies, currentTime) {
    // Always reacquire the target, preferring a different one than last shot
    this.acquireTarget(enemies);
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      this.lastTarget = this.target; // Remember this target for next shot
      // Play glue placed sprite animation (4 frames)
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.anims.play('glue_tower_anim', true);
      }
      const projConfig = projectileDefaults.glue || { speed: 500, hitRadius: 24, sprite: 'glue_projectile' };
      // Fire from tower center
      const startOffset = { x: this.position.x, y: this.position.y };
      if (!this.target || !this.target.position) return;
      const dx = this.target.position.x - startOffset.x;
      const dy = this.target.position.y - startOffset.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dir = { x: dx / mag, y: dy / mag };
      // Glue Tower doesn't deal damage, just slows (no multi-hit)
      let maxHits = 1;
      // Create and launch a GlueProjectile
      const projectile = new GlueProjectile({
        position: { ...startOffset },
        direction: dir,
        speed: projConfig.speed,
        damage: this.damage,
        texture: this.projectileTexture,
        target: this.target,
        hitRadius: projConfig.hitRadius,
        homing: this.homing,
        maxHits,
        slowAmount: 0.5, // 50% slow
        slowDuration: 2.5, // seconds
        stickinessLevel: this.stickinessLevel, // Pass stickiness level to projectile
        tower: this // Pass tower reference for spreading
      });
      // Create the projectile sprite
      const sprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
      sprite.setDisplaySize(24 * GAME_SCALE, 24 * GAME_SCALE);
      sprite.setScale(0.7);
      sprite.setDepth(3001);
      projectile.sprite = sprite;
      if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
        window.sceneRef.gameLogic.projectiles.push(projectile);
      }
    }
  }
}
