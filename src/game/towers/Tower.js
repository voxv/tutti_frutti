export class Tower {
  constructor({ position, range, fireRate, damage, cost, type }) {
    if (new.target === Tower) {
      throw new TypeError("Cannot instantiate abstract class Tower directly.");
    }
    this.position = position;
    this.range = range;
    this.fireRate = fireRate;
    this.damage = damage;
    this.cost = cost;
    this.type = type || "generic";
    this.lastShotTime = 0;
    this.target = null;
    this.level = 1;
    this.upgrades = [];
    this.isActive = true;
    // Always start with no upgrades unlocked
    this.unlockedUpgrades = { left: 0, right: 0 };
  }

  // Abstract methods
  acquireTarget(enemies) {
    throw new Error("Method 'acquireTarget(enemies)' must be implemented.");
  }

  fire(enemies, currentTime) {
    throw new Error("Method 'fire(enemies, currentTime)' must be implemented.");
  }


  // General upgrade application method
  applyUpgrade(upgradeKey) {
    // To be overridden by subclasses for specific upgrades
    // Add more generic upgrades here as needed
    this.upgrades.push(upgradeKey);
  }

  update(deltaTime, enemies) {
    throw new Error("Method 'update(deltaTime, enemies)' must be implemented.");
  }

  isInRange(enemy) {
    let GAME_SCALE = 1.0;
    if (typeof window !== 'undefined' && window.GAME_SCALE) {
      GAME_SCALE = window.GAME_SCALE;
    }
    const dx = enemy.position.x - this.position.x;
    const dy = enemy.position.y - this.position.y;
    const scaledRange = this.range * GAME_SCALE;
    return Math.sqrt(dx * dx + dy * dy) <= scaledRange;
  }
}
