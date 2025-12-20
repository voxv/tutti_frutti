
import { ProjectileTower } from "./ProjectileTower.js";
import towerDefaults from "./tower.json";
import projectileDefaults from "../projectiles.json";
import { BoulderProjectile } from "../projectiles/BoulderProjectile.js";
import { ExplosionProjectile } from "../projectiles/ExplosionProjectile.js";
import { GAME_SCALE } from "../../client/utils/scaleConfig.js";

export class BirdTower extends ProjectileTower {
  constructor(config = {}) {
    let defaults = { range: 120, fireRate: 1.0, damage: 1, cost: 600, type: "bird" };
    if (towerDefaults && towerDefaults.bird) {
      defaults = { ...defaults, ...towerDefaults.bird };
    }
    super({
      ...defaults,
      ...config,
      type: "bird"
    });
    this.projectileTexture = 'boulder';
    // Enable homing by default for BirdTower projectiles
    this.homing = config.homing !== undefined ? config.homing : true;
    // Always define infinity path params for upgrades
    this._infinityA = 100;
    this._infinityB = 50;
    this._infinityAngle = 0;
    this._infinitySpeed = Math.PI;
    this._pendingInfinityAIncrease = 0;
  }

  // Override to handle bird-specific upgrades
  applyUpgrade(upgradeKey) {
    if (upgradeKey === 'devastation_1') {
      this._devastationNeighbors = 1;
    } else if (upgradeKey === 'devastation_2') {
      this._devastationNeighbors = 2;
    } else if (upgradeKey === 'devastation_3') {
      this._devastationNeighbors = 3;
    }
    if (upgradeKey === 'wide_patrol_1' || upgradeKey === 'wide_patrol_2' || upgradeKey === 'wide_patrol_3') {
      // Expand the infinity path (travel farther)
      if (typeof this._infinityA === 'number') {
        this._infinityA += 40;
      } else {
        this._pendingInfinityAIncrease = (this._pendingInfinityAIncrease || 0) + 40;
      }
      if (typeof this._infinityB === 'number') {
        this._infinityB += 20;
      } else {
        this._pendingInfinityBIncrease = (this._pendingInfinityBIncrease || 0) + 20;
      }
      this.fireRate += 0.5;
    } else if (upgradeKey === 'faster_bird_1' || upgradeKey === 'faster_bird_2' || upgradeKey === 'faster_bird_3') {
      this.fireRate += 0.5;
    } else if (upgradeKey === 'double_shot') {
      this._doubleShot = true;
    } else if (upgradeKey === 'triple_shot') {
      this._tripleShot = true;
    } else if (upgradeKey === 'super_bird') {
      this.damage += 0.5;
    }
    this.upgrades = this.upgrades || [];
    this.upgrades.push(upgradeKey);
  }

  update(deltaTime, enemies) {
    // Infinity (figure-eight) flight motion
    if (typeof this._infinityAngle === 'number' && this._pathCenter && this._placedSprite) {
      this._infinityAngle += this._infinitySpeed * deltaTime;
      const a = this._infinityA;
      const b = this._infinityB;
      const cx = this._pathCenter.x;
      const cy = this._pathCenter.y;
      const t = this._infinityAngle;
      this._placedSprite.x = cx + a * Math.sin(t);
      this._placedSprite.y = cy + b * Math.sin(2 * t) / 2;
    }
    let currentTime = Date.now() / 1000;
    this.fire(enemies, currentTime);
  }

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 120;
    if (towerConfig && towerConfig.bird && towerConfig.bird.range) {
      range = towerConfig.bird.range;
    }
    const tower = new BirdTower({ position: { x, y } });
    const cellWidth = 100;
    const cellHeight = 100;
    // Use spritesheet for bird placed sprite
    const placedSprite = scene.add.sprite(x, y, 'bird_placed', 0)
      .setDisplaySize(cellWidth * 0.9, cellHeight * 0.9)
      .setDepth(8500) // Below boss (9999)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    // Play idle animation on placement (animation should already be created by setupTowerAnimations)
    placedSprite.play('bird_tower_idle');
    placedSprite.towerType = 'bird';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    // Store center and params for infinity path
    tower._pathCenter = { x, y };
    // If upgrades were applied before placement, apply pending infinityA increase
    if (typeof tower._infinityA !== 'number') tower._infinityA = 100;
    if (typeof tower._infinityB !== 'number') tower._infinityB = 50;
    if (typeof tower._infinityAngle !== 'number') tower._infinityAngle = 0;
    if (typeof tower._infinitySpeed !== 'number') tower._infinitySpeed = Math.PI;
    if (tower._pendingInfinityAIncrease) {
      tower._infinityA += tower._pendingInfinityAIncrease;
      tower._pendingInfinityAIncrease = 0;
    }
    // Attach reference for update
    placedSprite._parentTower = tower;
    return tower;
  }


  fire(enemies, currentTime) {
    // Always reacquire the first in-range bloon before firing
    this.acquireTarget(enemies);
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      // Optionally replay idle animation when firing (never stop/reset)
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.play('bird_tower_idle', true);
      }
      const projConfig = projectileDefaults.boulder || { speed: 400, hitRadius: 36, sprite: 'boulder' };
      // Bird throws from its current animated position
      const startOffset = { x: this._placedSprite?.x ?? this.position.x, y: this._placedSprite?.y ?? this.position.y };
      if (!this.target || !this.target.position) return;
      const dx = this.target.position.x - startOffset.x;
      const dy = this.target.position.y - startOffset.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dir = { x: dx / mag, y: dy / mag };
      // Allow multi-shot upgrades
      const shotCount = this._tripleShot ? 3 : (this._doubleShot ? 2 : 1);
      // Find devastation neighbors if upgrade is active
      let devastationCount = this._devastationNeighbors || 0;
      let devastationTargets = [];
      if (devastationCount > 0 && Array.isArray(enemies) && this.target && this.target.position) {
        // Find closest devastationCount enemies to the main target (excluding the main target)
        devastationTargets = enemies
          .filter(e => e !== this.target && e.position)
          .map(e => ({ e, dist: Math.hypot(e.position.x - this.target.position.x, e.position.y - this.target.position.y) }))
          .sort((a, b) => a.dist - b.dist)
          .slice(0, devastationCount)
          .map(obj => obj.e);
      }
      // Fire all projectiles at main target
      for (let i = 0; i < shotCount; i++) {
        const projectile = new BoulderProjectile({
          position: { ...startOffset },
          direction: dir,
          speed: projConfig.speed,
          damage: this.damage,
          texture: this.projectileTexture,
          target: this.target,
          hitRadius: projConfig.hitRadius,
          homing: true, // Always homing for BirdTower
          maxHits: 1,
          showExplosion: true // BirdTower projectiles always show explosion
        });
        // Attach reference to this tower for devastation upgrades
        projectile.sourceTower = this;
        const sprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
        sprite.setDisplaySize(24 * GAME_SCALE, 24 * GAME_SCALE);
        sprite.setScale(0.7);
        sprite.setDepth(3001);
        projectile.sprite = sprite;
        this.projectiles.push(projectile);
        if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
          window.sceneRef.gameLogic.projectiles.push(projectile);
        }
      }
      // Instantly destroy devastation neighbors (simulate as if hit by a projectile)
      for (const neighbor of devastationTargets) {
        // Play explosion for devastation effect using ExplosionProjectile
        if (neighbor && neighbor.position) {
          const explosionProjectile = new ExplosionProjectile({
            position: { ...neighbor.position },
            damage: 0,
            sourceTower: this
          });
          explosionProjectile.playExplosion(window.sceneRef);
        }
        if (neighbor && typeof neighbor.takeDamage === 'function') {
          // Exception: do NOT one-shot boss bloons
          if (neighbor.type === 'boss' || neighbor.constructor?.name === 'BossBloon') {
            neighbor.takeDamage(1, this); // Apply normal damage to boss
          } else {
            neighbor.takeDamage(99999, this); // Overkill damage to guarantee destruction
          }
        } else if (neighbor && neighbor.health !== undefined) {
          // Exception: do NOT one-shot boss bloons
          if (neighbor.type === 'boss' || neighbor.constructor?.name === 'BossBloon') {
            neighbor.health -= 1;
          } else {
            neighbor.health = 0;
          }
        }
      }
    }
  }

  // fireProjectile removed; handled in fire()
}
