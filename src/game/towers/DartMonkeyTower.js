import { Tower } from "./Tower.js";

export class DartMonkeyTower extends Tower {
    static placeOnScene(scene, x, y) {
      let range = 120;
      if (scene && scene.towerConfig && scene.towerConfig.dart_monkey && scene.towerConfig.dart_monkey.range) {
        range = scene.towerConfig.dart_monkey.range;
      }
      const tower = new DartMonkeyTower({ position: { x, y }, range });
      const cellWidth = 100;
      const cellHeight = 100;
      const placedSprite = scene.add.sprite(x, y, 'dart_monkey_placed', 0)
        .setDisplaySize(cellWidth * 0.7, cellHeight * 0.7)
        .setDepth(8500)
        .setAlpha(1)
        .setInteractive({ useHandCursor: true });
      placedSprite.towerType = 'dart_monkey';
      placedSprite.towerX = x;
      placedSprite.towerY = y;
      placedSprite.towerRange = range;
      tower._placedSprite = placedSprite;
      return tower;
    }
  constructor(config) {
    super({
      ...config,
      range: config.range || 120,
      fireRate: config.fireRate || 1.0,
      damage: config.damage || 1,
      cost: config.cost || 200,
      type: "dart_monkey"
    });
    this.projectiles = [];
  }

  acquireTarget(enemies) {
    // Simple targeting: first enemy in range
    for (const enemy of enemies) {
      if (this.isInRange(enemy)) {
        this.target = enemy;
        return enemy;
      }
    }
    this.target = null;
    return null;
  }

  fire(enemies, currentTime) {
    if (!this.target || !this.isInRange(this.target)) {
      this.acquireTarget(enemies);
    }
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      // Fire a dart (projectile logic would go here)
      this.lastShotTime = currentTime;
      // Example: create a projectile object
      this.projectiles.push({
        position: { ...this.position },
        target: this.target,
        damage: this.damage
      });
    }
  }

  upgrade() {
    this.level++;
    this.range += 20;
    this.damage += 1;
    this.fireRate += 0.2;
    this.cost += 100;
    this.upgrades.push({ level: this.level });
  }

  update(deltaTime, enemies) {
    // Example update: fire at target if possible
    const currentTime = Date.now() / 1000;
    this.fire(enemies, currentTime);
    // Update projectiles (not implemented here)
  }
}
