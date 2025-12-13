export class ClumpSpike {
  static placeOnScene(scene, x, y) {
    return new ClumpSpike(scene, x, y);
  }
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.maxLife = 5;
    this.life = 5;
    this.sprite = scene.add.sprite(x, y, 'clump_spike');
      this.sprite.setDisplaySize(50, 50); // Keep original sprite size
    this.sprite.setDepth(9000);
    // Do NOT set interactive for clump spike (not clickable)
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.clumpRef = this;
    this.active = true;
    // Dummy upgrades property for UI compatibility
    this.unlockedUpgrades = { left: 0, right: 0 };
    // Tower type for config mapping (if needed)
    this.towerType = 'clumpspike';
    // For shop/UI compatibility
    this._placedSprite = this.sprite;
  }

  // Empty update method for game loop compatibility
  update() {}

  hit() {
    if (!this.active) return;
    this.life--;
    // Shrink sprite as life decreases
    const scale = 0.16 + 0.08 * this.life;
    this.sprite.setScale(scale, scale);
    if (this.life <= 0) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
