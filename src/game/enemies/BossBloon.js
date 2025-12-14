import { Bloon } from "./Bloon.js";

export class BossBloon extends Bloon {
  constructor(path, config = {}) {
    // Merge defaults with provided config
    const defaults = {
      type: "boss",
      health: 12000,
      speed: 40,
      reward: 100
    };
    // Call parent constructor with merged config
    super(path, { ...defaults, ...config });

    // Ensure boss sprite and health bar are always above all towers/projectiles
    // This assumes _sprite and _healthBar are set after construction; provide a helper
    this.setBossDepths = () => {
      if (this._sprite && typeof this._sprite.setDepth === 'function') {
        this._sprite.setDepth(4000);
      }
      if (this._healthBar && typeof this._healthBar.setDepth === 'function') {
        this._healthBar.setDepth(4001);
      }
    };

    // Create a persistent health bar graphics object
    this._healthBar = null;
    this._createHealthBar = (scene) => {
      if (!scene || !scene.add) return;
      if (this._healthBar) {
        this._healthBar.destroy();
      }
      this._healthBar = scene.add.graphics();
      this._healthBar.setDepth(4001);
      this._healthBar.bossRef = this; // For debugging/cleanup
      this._healthBar.visible = true;
      this._healthBar.active = true;
      this._healthBar.isBossHealthBar = true;
      this.adjustHealthBarPosition();
    };

    // Adjust health bar position and redraw
    this.adjustHealthBarPosition = () => {
      if (this._healthBar && this._sprite) {
        // Place the health bar just above the boss sprite, closer than default
        this._healthBar.x = this._sprite.x;
        this._healthBar.y = this._sprite.y - (this._sprite.displayHeight ? this._sprite.displayHeight / 2 : 60) - 40;
      }
    };
    // Redraw the health bar graphics
    this.redrawHealthBar = () => {
      if (!this._healthBar || !this._sprite) return;
      const size = this.size || 120;
      const barWidth = size * 1.5;
      const barHeight = 12;
      const healthPercent = Math.max(0, this.health / (this.maxHealth || 500));
      this._healthBar.clear();
      // Background
      this._healthBar.fillStyle(0x333333, 1);
      this._healthBar.fillRect(-barWidth/2, 0, barWidth, barHeight);
      // Health
      this._healthBar.fillStyle(0x00FF00, 1);
      this._healthBar.fillRect(-barWidth/2, 0, barWidth * healthPercent, barHeight);
      // Border
      this._healthBar.lineStyle(2, 0xFFFFFF, 1);
      this._healthBar.strokeRect(-barWidth/2, 0, barWidth, barHeight);
    };
    // If you want to create the health bar, call this._createHealthBar(scene) after sprite creation.
  }

  // You can override methods here for special boss behavior if needed
  // For now, it behaves like a tough regular bloon

  update(deltaTime, scene) {
    // Call base update
    super.update(deltaTime);
    // If health bar not created and sprite exists, create it
    if (!this._healthBar && this._sprite && scene) {
      this._createHealthBar(scene);
    }
    // Always keep health bar close to boss and redraw
    if (this._healthBar && this._sprite) {
      this.adjustHealthBarPosition();
      this.redrawHealthBar();
    }
  }
}
