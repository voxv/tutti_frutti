import { Bloon } from "./Bloon.js";

export class BossBloon extends Bloon {
  constructor(path, config = {}) {
    // Merge defaults with provided config
    const defaults = {
      type: "boss",
      health: 10000,
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
  }

  // You can override methods here for special boss behavior if needed
  // For now, it behaves like a tough regular bloon
}
