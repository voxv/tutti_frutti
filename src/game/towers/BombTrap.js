export class BombTrap {
  static placeOnScene(scene, x, y) {
    return new BombTrap(scene, x, y);
  }

  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.active = true;
    this.exploded = false;
    this.sprite = scene.add.sprite(x, y, 'bomb_trap');
    this.sprite.setDisplaySize(69, 69);
    this.sprite.setDepth(9000);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.bombRef = this;
    // For shop/UI compatibility
    this._placedSprite = this.sprite;
    // Tower type for config mapping (if needed)
    this.towerType = 'bomb_trap';
    // Dummy upgrades property for UI compatibility
    this.unlockedUpgrades = { left: 0, right: 0 };

    // Start flashing red effect for 2 seconds (arming)
    this._flashState = false;
    this._flashInterval = setInterval(() => {
      if (this.sprite) {
        this._flashState = !this._flashState;
        if (this._flashState) {
          this.sprite.setTint(0xff2222); // Red tint
        } else {
          this.sprite.clearTint();
        }
      }
    }, 120);

    // Start timer to auto-explode after 2 seconds
    this._explodeTimeout = setTimeout(() => {
      this.explode();
    }, 2000);
  }

  // Empty update method for game loop compatibility
  update() {}

  // Called when a fruit collides with the bomb trap
  explode() {
    if (!this.active || this.exploded) return;
    this.exploded = true;
    this.active = false;
    // Play explosion animation if available
    if (this._flashInterval) {
      clearInterval(this._flashInterval);
      this._flashInterval = null;
    }
    if (this.sprite) {
      this.sprite.clearTint();
      this.sprite.setTexture('bomb_anim');
      if (typeof this.sprite.play === 'function') {
        this.sprite.play('bomb_idle');
      }
      // Play boom sound if available
      if (this.scene.sound && typeof this.scene.sound.play === 'function') {
        this.scene.sound.play('boom');
      }
      // Get animation duration from config or default to 400ms
      const anim = this.scene.anims.get('bomb_idle');
      const duration = anim ? (anim.frames.length / (anim.frameRate || 1)) * 1000 : 400;
      setTimeout(() => {
        this.destroy();
      }, duration);
    }
    // Damage all fruits in radius (handled in collision logic)
  }

  destroy() {
    this.active = false;
    if (this._explodeTimeout) {
      clearTimeout(this._explodeTimeout);
      this._explodeTimeout = null;
    }
    if (this._flashInterval) {
      clearInterval(this._flashInterval);
      this._flashInterval = null;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
