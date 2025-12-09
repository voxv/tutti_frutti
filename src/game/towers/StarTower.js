import { ProjectileTower } from "./ProjectileTower.js";
import { BoulderProjectile } from "../projectiles/BoulderProjectile.js";

export class StarTower extends ProjectileTower {
  constructor(scene, x, y, config) {
    console.log('StarTower constructor scene:', scene);
    console.log('StarTower constructor scene.physics:', scene?.physics);
    config = config || {};
    config.position = { x, y };
    if (!config.fireRate) config.fireRate = 1.5; // Match CannonTower default
    super(config);

    // Assign the scene to this.scene
    this.scene = scene;

    this.config = config;
    this.towerType = 'star'; // Ensure correct type for upgrade UI
    this.towerX = x; // Needed for upgrade UI/range circle
    this.towerY = y;
    // Set up animation for placed sprite
    if (this._sprite && this._sprite.anims) {
      // Idle: frame 0
      this._sprite.setFrame(0);
    }
    this._isAttacking = false;
    this.projectiles = []; // Initialize projectiles array
  }

  fire(enemies, currentTime) {
    // Play attack animation once, then return to idle
    const animKey = this.config?.assets?.animation?.key || 'star_tower_anim';
    const sprite = this._placedSprite || this._sprite;
    if (sprite && sprite.anims) {
      sprite.anims.play({
        key: animKey,
        startFrame: 0,
        repeat: 0
      }, true);
      sprite.once('animationcomplete', () => {
        sprite.setFrame(0);
      });
    }
    if (!this.scene || !this.scene.add) {
      console.error("Scene or scene.add is undefined in StarTower.fire");
      return;
    }
    // Determine number of projectiles based on upgrades
    let numProjectiles = 6; // Base: 6 projectiles
    if (this.upgrades && this.upgrades.includes('double_spike')) {
      numProjectiles = 7;
    }
    if (this.upgrades && this.upgrades.includes('triple_spike')) {
      numProjectiles = 8;
    }
    if (this.upgrades && this.upgrades.includes('quadruple_spike')) {
      numProjectiles = 10;
    }
    
    const projConfig = { speed: 200, hitRadius: 36, sprite: 'boulder' };
    for (let i = 0; i < numProjectiles; i++) {
      const angle = (2 * Math.PI / numProjectiles) * i;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const startOffset = { x: this.position.x, y: this.position.y };
      const projectile = new BoulderProjectile({
        position: { ...startOffset },
        direction: direction,
        speed: projConfig.speed,
        damage: this.damage || 1,
        texture: projConfig.sprite,
        target: null,
        hitRadius: projConfig.hitRadius,
        homing: false,
        maxHits: 1,
        showExplosion: false
      });
      // Set onHit method to destroy projectile on hit
      projectile.onHit = function(enemy) {
        if (enemy && typeof enemy.takeDamage === 'function') {
          enemy.takeDamage(this.damage);
        }
        this.isActive = false;
        if (this.sprite) {
          this.sprite.destroy();
          this.sprite = null;
        }
      };
      const sprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
      sprite.setDisplaySize(14, 14); // Smaller size
      sprite.setScale(0.45); // Smaller scale
      sprite.setDepth(3001);
      projectile.sprite = sprite;
      this.projectiles.push(projectile);
      if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
        window.sceneRef.gameLogic.projectiles.push(projectile);
      }
    }
  }

  update(deltaTime, enemies) {
    let currentTime = Date.now() / 1000;
    // Acquire target from enemies in range
    this.acquireTarget(enemies);
    // Only fire if a target is in range
    if (this.target && (!this.lastShotTime || currentTime - this.lastShotTime >= 1 / (this.fireRate || 1))) {
      this.lastShotTime = currentTime;
      this.fire(enemies, currentTime);
    }
    // Update projectiles
    for (const projectile of this.projectiles) {
      if (projectile && typeof projectile.update === 'function') {
        projectile.update(deltaTime);
      }
    }
  }

  applyUpgrade(upgradeKey) {
    if (upgradeKey === 'attack_speed_1' || upgradeKey === 'attack_speed_2' || upgradeKey === 'attack_speed_3') {
      this.fireRate += 0.5;
      console.log(`StarTower upgraded: ${upgradeKey}, new fireRate: ${this.fireRate}`);
    }
    this.upgrades.push(upgradeKey);
  }

  static placeOnScene(scene, x, y) {
    console.log('StarTower.placeOnScene scene:', scene);
    console.log('StarTower.placeOnScene scene.physics:', scene?.physics);
    // Get config from scene.towerConfig if available
    let config = {};
    if (scene && scene.towerConfig && scene.towerConfig.star) {
      config = { ...scene.towerConfig.star };
    }
    // Set up position
    config.position = { x, y };
    // Create the tower instance
    const tower = new StarTower(scene, x, y, config);
    // Add placed sprite
    const animKey = config.assets?.animation?.key || 'star_tower_anim';
    const frameWidth = config.assets?.animation?.frameWidth || 455;
    const frameHeight = config.assets?.animation?.frameHeight || 351;
    // Add the sprite to the scene - make it interactive like CannonTower
    const placedSprite = scene.add.sprite(x, y, 'star_placed', 0)
      .setScale(0.12)
      .setDepth(20)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'star';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = tower.range;
    // Register animation if not already present
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers('star_anim', { start: 0, end: 2 }),
        frameRate: config.assets?.animation?.frameRate || 12,
        repeat: 0
      });
    }
    // Set idle frame
    placedSprite.setFrame(0);
    // Link sprite for game logic
    tower._placedSprite = placedSprite;
    return tower;
  }
}
