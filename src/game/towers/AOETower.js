import { Tower } from "./Tower.js";

export class AOETower extends Tower {
  constructor(config = {}) {
    // Preserve child type if provided, default to 'aoe'
    super({ ...config, type: config.type || "aoe" });
    // Max number of bloons affected per attack (can be upgraded)
    this.maxBloonsPerAttack = config.maxBloonsPerAttack || 2;
  }

  // (removed duplicate static method and extra closing brace)

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 120;
    if (towerConfig && towerConfig.aoe && towerConfig.aoe.range) {
      range = towerConfig.aoe.range;
    }
    const tower = new AOETower({ position: { x, y } });
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    // Use a generic sprite for AOE, or customize as needed
    const placedSprite = scene.add.image(x, y, 'tower_1')
      .setDisplaySize(cellWidth * 0.8, cellHeight * 0.8)
      .setDepth(8500)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'aoe';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    return tower;
  }

  acquireTarget(enemies) {
    // AOE tower doesn't need a single target
    return null;
  }

  fire(enemies, currentTime) {
    if (currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      // Find up to maxBloonsPerAttack active enemies in range
      const bloonsInRange = [];
      for (const enemy of enemies) {
        if (enemy.isActive && this.isInRange(enemy)) {
          bloonsInRange.push(enemy);
          if (bloonsInRange.length >= (this.maxBloonsPerAttack || 1)) break;
        }
      }
      for (const enemy of bloonsInRange) {
        // Mark bloon for recursive destruction if tower has storm_spin or blade_master upgrade
        if (this.constructor.name === 'KnifeTower' && (this._stormSpinActive || this._bladeMaster)) {
          enemy.maxBloonsPerAttack = this.maxBloonsPerAttack;
        }
        // Special logic for KnifeTower with sharper_blade
        if (this.constructor.name === 'KnifeTower' && this._sharperBlade) {
          enemy.takeDamage({ sharperBlade: true });
        } else {
          enemy.takeDamage(this.damage);
        }
        // Award gold if bloon is destroyed and NOT at end
        if (!enemy.isActive && !(enemy.isAtEnd && enemy.isAtEnd()) && typeof window.sceneRef === 'object' && window.sceneRef) {
          window.sceneRef.goldAmount += enemy.reward;
          if (window.sceneRef.goldText) {
            window.sceneRef.goldText.setText(String(window.sceneRef.goldAmount));
          }
          if (typeof window.sceneRef._refreshShopAvailability === 'function') {
            window.sceneRef._refreshShopAvailability();
          }
          if (typeof window.sceneRef.refreshUpgradeUIIfVisible === 'function') {
            window.sceneRef.refreshUpgradeUIIfVisible();
          }
          // Play squirt sound when bloon is destroyed with storm_spin
          if (this.constructor.name === 'KnifeTower' && this._stormSpinActive && window.sceneRef.sound && window.sceneRef.sound.play) {
            window.sceneRef.sound.play('squirt');
          }
        }
      }
      // Visualization: pulse effect (commented out for later reuse)
      /*
      if (typeof window.sceneRef === 'object' && window.sceneRef) {
        const pulse = window.sceneRef.add.circle(this.position.x, this.position.y, this.range * 0.5, 0xffff00, 0.4);
        pulse.setDepth(3000);
        window.sceneRef.tweens.add({
          targets: pulse,
          alpha: 0,
          scale: 2,
          duration: 200,
          onComplete: () => pulse.destroy()
        });
      }
      */
    }
  }

  update(deltaTime, enemies) {
    let currentTime = Date.now() / 1000;
    this.fire(enemies, currentTime);
  }
}
