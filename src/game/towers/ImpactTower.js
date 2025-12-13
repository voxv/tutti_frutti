import { AOETower } from "./AOETower.js";

let IMPACT_TOWER_ID = 1;
export class ImpactTower extends AOETower {
  constructor(config = {}) {
    let defaults = {
      range: 120,
      fireRate: 1.0,
      damage: 2,
      cost: 500,
      type: "aoe",
      towerType: "impact",
    };
    const finalConfig = { ...defaults, ...config };
    super(finalConfig);
    this.range = finalConfig.range || 120;
    this.fireRate = finalConfig.fireRate || 1.0;
    this.damage = finalConfig.damage || 2;
    this.towerType = 'impact';
    this.maxBloonsPerAttack = 1; // Only hit one fruit at a time by default
    this._attackState = null; // 'runup', 'charge', 'return', null
    this._attackStartTime = 0;
    this._originalX = 0;
    this._originalY = 0;
    this._attackTarget = null;
    this._impactTowerId = IMPACT_TOWER_ID++;
  }

  static placeOnScene(scene, x, y) {
    // Get range from config
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 120;
    if (towerConfig && towerConfig.impact && towerConfig.impact.range) {
      range = towerConfig.impact.range;
    }
    const placedSprite = scene.add.sprite(x, y, 'impact_placed', 0)
      .setDisplaySize(100 * 0.7, 100 * 0.7)
      .setDepth(8500)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'impact';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    const tower = new ImpactTower({ position: { x, y }, range: range });
    tower.position = { x, y };
    tower.range = range;
    tower.towerType = 'impact';
    tower._placedSprite = placedSprite;
    tower._originalX = x;
    tower._originalY = y;
    placedSprite._parentTower = tower;
    return tower;
  }

  applyUpgrade(upgradeKey) {
    console.log(`[ImpactTower] [ID ${this._impactTowerId}] Applying upgrade: ${upgradeKey}, current maxBloonsPerAttack: ${this.maxBloonsPerAttack}`, this);
    if (upgradeKey === 'bigger_impact') {
      this.maxBloonsPerAttack = 3; // Destroy 2 fruits
      console.log(`[ImpactTower] bigger_impact applied, maxBloonsPerAttack now: ${this.maxBloonsPerAttack}`);
    } else if (upgradeKey === 'bigger_impact2') {
      this.maxBloonsPerAttack = 4; // Destroy 3 fruits
      console.log(`[ImpactTower] bigger_impact2 applied, maxBloonsPerAttack now: ${this.maxBloonsPerAttack}`);
    } else if (upgradeKey === 'bigger_impact3') {
      this.maxBloonsPerAttack = 5; // Destroy 4 fruits
      console.log(`[ImpactTower] bigger_impact3 applied, maxBloonsPerAttack now: ${this.maxBloonsPerAttack}`);
    } else if (upgradeKey === 'faster_impact' || upgradeKey === 'faster_impact2' || upgradeKey === 'faster_impact3') {
      this.fireRate += 0.7;
      console.log(`[ImpactTower] ${upgradeKey} applied, fireRate now: ${this.fireRate}`);
      if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
        this._placedSprite.towerFireRate = this.fireRate;
      }
    } else if (upgradeKey === 'massive_impact') {
      this.damage += 2;
      this.range += 50;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    }
    if (!this.upgrades) this.upgrades = [];
    this.upgrades.push(upgradeKey);
    console.log(`[ImpactTower] [ID ${this._impactTowerId}] Upgrades array after apply:`, this.upgrades, this);
  }

  update(deltaTime, enemies) {
    // Update position based on attack state
    if (this._attackState && this._placedSprite) {
      const elapsed = performance.now() - this._attackStartTime;
      const runupDuration = 200; // ms
      const chargeDuration = 150; // ms
      const returnDuration = 200; // ms
      const runupDistance = 50; // pixels to move back
      
      if (this._attackState === 'runup' && elapsed < runupDuration && this._attackTarget) {
        // Move away from target (run-up)
        const dx = this._attackTarget.position.x - this._originalX;
        const dy = this._attackTarget.position.y - this._originalY;
        const mag = Math.sqrt(dx * dx + dy * dy);
        const dirX = mag > 0 ? dx / mag : 0;
        const dirY = mag > 0 ? dy / mag : 0;
        const progress = elapsed / runupDuration;
        this._placedSprite.x = this._originalX - dirX * runupDistance * progress;
        this._placedSprite.y = this._originalY - dirY * runupDistance * progress;
      } else if (this._attackState === 'runup') {
        // Transition to charge
        this._attackState = 'charge';
        this._attackStartTime = performance.now();
      } else if (this._attackState === 'charge' && elapsed < chargeDuration && this._attackTarget) {
        // Move towards target (charge)
        const dx = this._attackTarget.position.x - this._originalX;
        const dy = this._attackTarget.position.y - this._originalY;
        const mag = Math.sqrt(dx * dx + dy * dy);
        const dirX = mag > 0 ? dx / mag : 0;
        const dirY = mag > 0 ? dy / mag : 0;
        const progress = elapsed / chargeDuration;
        const chargeDistance = 40; // pixels to move towards target
        this._placedSprite.x = this._originalX + dirX * chargeDistance * progress;
        this._placedSprite.y = this._originalY + dirY * chargeDistance * progress;
      } else if (this._attackState === 'charge') {
        // Transition to return
        this._attackState = 'return';
        this._attackStartTime = performance.now();
      } else if (this._attackState === 'return' && elapsed < returnDuration) {
        // Move back to original position
        const progress = elapsed / returnDuration;
        this._placedSprite.x = this._originalX + (this._placedSprite.x - this._originalX) * (1 - progress);
        this._placedSprite.y = this._originalY + (this._placedSprite.y - this._originalY) * (1 - progress);
      } else if (this._attackState === 'return') {
        // Return to idle
        this._placedSprite.x = this._originalX;
        this._placedSprite.y = this._originalY;
        this._attackState = null;
      }
    }
    
    // Call parent update for normal firing
    super.update(deltaTime, enemies);
  }

  fire(enemies, currentTime) {
    if (currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      // Find ALL active enemies in range
      const bloonsInRange = [];
      for (const enemy of enemies) {
        if (enemy.isActive && this.isInRange(enemy)) {
          bloonsInRange.push(enemy);
        }
      }
      
      if (bloonsInRange.length === 0) return;
      
      // Sort by distance to tower (closest = newest to range)
      bloonsInRange.sort((a, b) => {
        const distA = Math.hypot(a.position.x - this.position.x, a.position.y - this.position.y);
        const distB = Math.hypot(b.position.x - this.position.x, b.position.y - this.position.y);
        return distA - distB;
      });
      
      // Target the closest fruit (last one that entered range)
      const targetEnemy = bloonsInRange[0];
      
      // Select up to maxBloonsPerAttack enemies (including the target)
      const maxBloons = this.maxBloonsPerAttack || 1;
      const targetedEnemies = bloonsInRange.slice(0, maxBloons);
      console.log(`[ImpactTower fire] [ID ${this._impactTowerId}] maxBloonsPerAttack=${maxBloons}, bloonsInRange=${bloonsInRange.length}, targetedEnemies=${targetedEnemies.length}`, this);
      
      // Start attack animation if there are enemies to hit
      if (targetedEnemies.length > 0) {
        this._attackTarget = targetEnemy;
        this._attackState = 'runup';
        this._attackStartTime = performance.now();
      }
      
      // Damage all targeted bloons
      for (const enemy of targetedEnemies) {
        enemy.takeDamage(this.damage);
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
        }
      }
    }
  }
}
