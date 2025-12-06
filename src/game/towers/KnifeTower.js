import { AOETower } from "./AOETower.js";
// Use global towerDefaults loaded in main.js instead of importing JSON

export class KnifeTower extends AOETower {
  constructor(config = {}) {
    // Load defaults from window.towerDefaults if available
    let defaults = { range: 120, fireRate: 1, damage: 1, cost: 200, type: "knife" };
    if (typeof window !== 'undefined' && window.towerDefaults && window.towerDefaults.knife) {
      defaults = { ...defaults, ...window.towerDefaults.knife };
    }
    super({
      ...defaults,
      ...config,
      type: "knife"
    });
  }

  // Handle upgrades by key
  applyUpgrade(upgradeKey) {
    if (upgradeKey === 'faster_blades') {
      this.fireRate += 5;
      // Track animation speed multiplier instead of modifying global animation
      this._animationSpeedMultiplier = (this._animationSpeedMultiplier || 1) * 1.2;
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.anims.timeScale = this._animationSpeedMultiplier;
      }
    } else if (upgradeKey === 'blade_master') {
      // Pop 2 children at a time (same as storm_spin)
      this.maxBloonsPerAttack = 2;
      // Track animation speed multiplier instead of modifying global animation
      this._animationSpeedMultiplier = (this._animationSpeedMultiplier || 1) * 1.5;
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.anims.timeScale = this._animationSpeedMultiplier;
      }
    } else if (upgradeKey === 'sharper_blade') {
      // Keep damage at 1, but mark for special child pop logic
      this.damage = 1;
      this._sharperBlade = true;
    } else if (upgradeKey === 'bigger_range') {
      this.range += 10;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'even_bigger_range') {
      this.range += 10;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'storm_spin') {
      // Pop 2 children at a time
      this.maxBloonsPerAttack = 2;
      // Enable spinning while bloons are in range
      this._stormSpinActive = true;
    } else if (upgradeKey === 'blade_master') {
      // Pop 2 children at a time (same as storm_spin)
      this.maxBloonsPerAttack = 2;
    }
    // Ensure that if either storm_spin or blade_master is active, maxBloonsPerAttack is 2
    if (this._stormSpin || this._bladeMaster) {
      this.maxBloonsPerAttack = 2;
    }
    // Add more knife-specific upgrades here
    this.upgrades.push(upgradeKey);
  }

  update(deltaTime, enemies) {
    // Call parent update
    if (super.update) super.update(deltaTime, enemies);
    if (this._placedSprite) {
      // Only stop animation and set frame 0 if storm_spin is active
      if (this._stormSpinActive) {
        if (this._placedSprite.anims && this._placedSprite.anims.isPlaying) {
          this._placedSprite.stop();
        }
        if (this._placedSprite.frame && this._placedSprite.frame.name !== 0 && this._placedSprite.setFrame) {
          this._placedSprite.setFrame(0);
        }
        // Storm spin: rotate sprite if any bloons are in range
        if (Array.isArray(enemies)) {
          const anyInRange = enemies.some(e => e.isActive && this.isInRange(e));
          if (anyInRange) {
            this._placedSprite.rotation += 0.7;
          } else {
            this._placedSprite.rotation = 0;
          }
        }
      }
    }
  }

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 120;
    if (towerConfig && towerConfig.knife && towerConfig.knife.range) {
      range = towerConfig.knife.range;
    }
    const tower = new KnifeTower({ position: { x, y } });
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    const placedSprite = scene.add.sprite(x, y, 'knife_tower_anim', 0)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(cellWidth * 0.8, cellHeight * 0.8)
      .setDepth(1001)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.setFrame(0);
    placedSprite.stop(); // Stop any animations
    // Reset animation timeScale to 1 to ensure fresh animation speed
    if (placedSprite.anims) {
      placedSprite.anims.timeScale = 1;
    }
    placedSprite.towerType = 'knife_tower';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    // Reset animation speed multiplier for this tower instance
    tower._animationSpeedMultiplier = 1;
    return tower;
  }
}

