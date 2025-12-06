import { AOETower } from "./AOETower.js";

export class GlacialTower extends AOETower {
    // Handle upgrades by key
    applyUpgrade(upgradeKey) {
      if (!this.upgrades) this.upgrades = [];
        if (upgradeKey === 'bigger_range' || upgradeKey === 'even_bigger_range') {
          this.range += 52;
          if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
            this._placedSprite.towerRange = this.range;
          }
          if (window.sceneRef && window.sceneRef.refreshUpgradeUIIfVisible) {
            window.sceneRef.refreshUpgradeUIIfVisible();
          }
          console.debug(`[GlacialTower] Bought ${upgradeKey}, new range:`, this.range);
      } else if (upgradeKey === 'attack_speed') {
        this.fireRate += 0.7;
        if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
          this._placedSprite.towerFireRate = this.fireRate;
        }
        console.debug(`[GlacialTower] Bought attack_speed, new fireRate:`, this.fireRate);
      } else if (upgradeKey === 'attack_speed_2') {
        this.fireRate += 0.7;
        if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
          this._placedSprite.towerFireRate = this.fireRate;
        }
        console.debug(`[GlacialTower] Bought attack_speed_2, new fireRate:`, this.fireRate);
      } else if (upgradeKey === 'deep_freeze_1') {
        // Enable special pop logic: pop bloon and its child
        this._deepFreeze1 = true;
        // Set freeze duration for this upgrade
        this._freezeDuration = 2000; // 2 seconds
      } else if (upgradeKey === 'deep_freeze_2') {
        // Extend freeze duration even more
        this._deepFreeze2 = true;
        this._freezeDuration = 3000; // 3 seconds
      }
      // Add more glacial-specific upgrades here
      this.upgrades.push(upgradeKey);
    }
  constructor(config = {}) {
    // Load defaults from tower.json if available
    let defaults = { range: 120, fireRate: 1, damage: 1, cost: 200, type: "glacial" };
    if (towerDefaults && towerDefaults.glacial) {
      defaults = { ...defaults, ...towerDefaults.glacial };
    }
    super({
      ...defaults,
      ...config,
      type: "glacial"
    });
    if (!this.upgrades) this.upgrades = [];
    // Base freeze duration
    this._freezeDuration = 1000; // 1 second by default
  }

    fire(enemies, currentTime) {
      if (currentTime - this.lastShotTime >= 1 / this.fireRate) {
        this.lastShotTime = currentTime;
        // Find up to maxBloonsPerAttack active enemies in range
        const bloonsInRange = [];
        for (const enemy of enemies) {
          if (enemy.isActive && this.isInRange(enemy)) {
            bloonsInRange.push(enemy);
            if (bloonsInRange.length >= this.maxBloonsPerAttack) break;
          }
        }
        for (const enemy of bloonsInRange) {
          const isBoss = enemy.type === 'boss' || enemy.constructor?.name === 'BossBloon';
          
          // Always freeze (bosses get frozen without damage)
          if (typeof enemy.freeze === 'function') {
            enemy.freeze(this._freezeDuration);
          }
          
          // Only apply damage to non-boss bloons with deep_freeze upgrades
          if (!isBoss && this._deepFreeze1 && typeof enemy.takeDamage === 'function') {
            // Schedule pop after freeze ends
            setTimeout(() => {
              // Pop the bloon using standard damage so gold is awarded
              enemy.takeDamage(enemy.health);
            }, this._freezeDuration);
          }
          // If deep_freeze_1 is not active, do NOT call takeDamage (just freeze)
        }
        // Visualization: pulse effect only if there are bloons in range
        if (bloonsInRange.length > 0 && typeof window.sceneRef === 'object' && window.sceneRef) {
          const pulse = window.sceneRef.add.circle(this.position.x, this.position.y, this.range * 0.5, 0xffffff, 0.4);
          pulse.setDepth(3000);
          window.sceneRef.tweens.add({
            targets: pulse,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => pulse.destroy()
          });
        }
      }
    }

  // AOETower handles fire logic

  upgrade() {
    this.level++;
    this.range += 20;
    this.damage += 1;
    this.fireRate += 0.2;
    this.cost += 100;
    this.upgrades.push({ level: this.level });
  }

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 120;
    if (towerConfig && towerConfig.glacial && towerConfig.glacial.range) {
      range = towerConfig.glacial.range;
    }
    const tower = new GlacialTower({ position: { x, y } });
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    // Make the placed GlacialTower smaller (0.55 instead of 0.8)
    const placedSprite = scene.add.image(x, y, 'glacial')
      .setDisplaySize(cellWidth * 0.72, cellHeight * 0.72)
      .setDepth(1001)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.setFrame(0);
    placedSprite.towerType = 'glacial';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    return tower;
  }
}
