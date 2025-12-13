import { ProjectileTower } from "./ProjectileTower.js";
import { FireProjectile } from "../projectiles/FireProjectile.js";

export class FireTower extends ProjectileTower {
  static placeOnScene(scene, x, y) {
    // Get config from scene.towerConfig if available
    let config = {};
    if (scene && scene.towerConfig && scene.towerConfig.fire) {
      config = { ...scene.towerConfig.fire };
    }
    return new FireTower(scene, x, y, config);
  }

  constructor(scene, x, y, config = {}) {
    super({
      position: { x, y },
      range: config.range || 180,
      fireRate: config.fireRate || 0.3,
      damage: config.damage || 2,
      cost: config.cost || 420,
      type: config.type || "fire",
      towerType: config.towerType || "fire"
    });
    this.scene = scene;
    this.towerType = config.towerType || "fire";
    this.sprite = scene.add.sprite(x, y, "fire");
    this.sprite.setDisplaySize(80, 80);
    this.sprite.setDepth(9000);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.towerType = this.towerType; // Copy towerType to sprite for upgrade UI
    this.sprite.towerX = x; // Store tower position for range circle
    this.sprite.towerY = y; // Store tower position for range circle
    this._placedSprite = this.sprite;
    this.fireCooldown = 0;
    this.lastShotTime = 0;
    this.maxFruits = 10; // Max fruits each fire projectile can damage
  }

  applyUpgrade(upgradeKey) {
    if (!this.upgrades) this.upgrades = [];
    
    // Rapid fire upgrades - increase fireRate
    if (upgradeKey === 'rapid_fire_1' || upgradeKey === 'rapid_fire_2' || upgradeKey === 'rapid_fire_3') {
      this.fireRate += 0.1;
      if (this._placedSprite) this._placedSprite.towerFireRate = this.fireRate;
    }
    
    // Persistent fire upgrades - increase fireLifespan by 500ms and maxFruits by 8
    if (upgradeKey === 'persistent_fire_1' || upgradeKey === 'persistent_fire_2' || upgradeKey === 'persistent_fire_3') {
      if (!this.fireLifespan) {
        this.fireLifespan = (this.scene && this.scene.towerConfig && this.scene.towerConfig.fire && this.scene.towerConfig.fire.fireLifespan) || 1000;
      }
      this.fireLifespan += 300;
      this.maxFruits += 3;
      if (this._placedSprite) this._placedSprite.towerFireLifespan = this.fireLifespan;
      if (this._placedSprite) this._placedSprite.towerMaxFruits = this.maxFruits;
    }
    
    // Add more fire-specific upgrades here as needed
    this.upgrades.push(upgradeKey);
    if (window.sceneRef && window.sceneRef.refreshUpgradeUIIfVisible) {
      window.sceneRef.refreshUpgradeUIIfVisible();
    }
  }

  update(deltaTime, enemies, path) {
    // Get path points from the scene if not provided
    let pathPoints = path;
    if ((!pathPoints || !Array.isArray(pathPoints) || pathPoints.length === 0) && this.scene && this.scene.pathPoints) {
      pathPoints = this.scene.pathPoints;
    }

    // Decrement cooldown
    if (this.fireCooldown && this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }

    // Fire if cooldown is ready and there are enemies in range
    if ((this.fireCooldown === undefined || this.fireCooldown === 0 || this.fireCooldown <= 0)) {
      // Check if there are any enemies in range
      let enemiesInRange = [];
      if (enemies && Array.isArray(enemies)) {
        for (const enemy of enemies) {
          if (enemy && enemy.isActive && this.isInRange(enemy)) {
            enemiesInRange.push(enemy);
          }
        }
      }
      // Only fire if there are enemies in range
      if (enemiesInRange.length === 0) {
        super.update(deltaTime, enemies, path);
        return;
      }

      // Try to find points along the spline (road) within the tower's range
      let firePos = null;
      if (this.scene && this.scene.spline) {
        const pointsOnSpline = [];
        const numSamples = 100;
        const effectiveRange = this.range * 0.7; // Use 70% of range for landing points
        for (let i = 0; i <= numSamples; i++) {
          const t = i / numSamples;
          const pt = this.scene.spline.getPoint(t);
          if (!pt) continue;
          const dx = pt.x - this.position.x;
          const dy = pt.y - this.position.y;
          if (Math.sqrt(dx * dx + dy * dy) <= effectiveRange) {
            pointsOnSpline.push({ x: pt.x, y: pt.y });
          }
        }
        if (pointsOnSpline.length > 0) {
          // Pick a random point on the path
          firePos = pointsOnSpline[Math.floor(Math.random() * pointsOnSpline.length)];
          // Add a small random offset for more visual randomness
          const verticalOffset = (Math.random() - 0.5) * 12; // -6 to +6 px
          firePos = { x: firePos.x, y: firePos.y + verticalOffset };
        }
      }
      // If no path points are in range, fire at the nearest enemy in range
      if (!firePos && enemiesInRange.length > 0) {
        // Find the nearest enemy in range
        let nearest = enemiesInRange[0];
        let minDist = Math.sqrt(
          Math.pow(nearest.position.x - this.position.x, 2) +
          Math.pow(nearest.position.y - this.position.y, 2)
        );
        for (const enemy of enemiesInRange) {
          const dist = Math.sqrt(
            Math.pow(enemy.position.x - this.position.x, 2) +
            Math.pow(enemy.position.y - this.position.y, 2)
          );
          if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
          }
        }
        firePos = { x: nearest.position.x, y: nearest.position.y };
      }
      if (firePos) {
        this.throwFire(firePos);
        this.fireCooldown = 1 / (this.fireRate || 1);
      }
    }

    super.update(deltaTime, enemies, path);
  }

  throwFire(position) {
    // Animate fire projectile flying from tower to the target position
    const startX = this.position.x;
    const startY = this.position.y;
    const endX = position.x;
    const endY = position.y;
    
    // Create the fire projectile at the tower's position
    const projectile = new FireProjectile({
      scene: this.scene,
      x: startX,
      y: startY,
      target: position,
      damage: this.damage,
      maxFruits: this.maxFruits
    });

    // Animate the projectile flying to the target
    this.scene.tweens.add({
      targets: projectile.sprite,
      x: endX,
      y: endY,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Projectile has landed on the road and stays static
        projectile.position.x = endX;
        projectile.position.y = endY;
        // Destroy the projectile after a configurable lifespan
        const fireLifespan = this.fireLifespan || (this.scene.towerConfig && this.scene.towerConfig.fire && this.scene.towerConfig.fire.fireLifespan) || 1000;
        setTimeout(() => {
          projectile.destroy();
          // Remove from game logic projectiles array
          if (this.scene.gameLogic.projectiles) {
            const idx = this.scene.gameLogic.projectiles.indexOf(projectile);
            if (idx !== -1) this.scene.gameLogic.projectiles.splice(idx, 1);
          }
          // Remove from tower's projectiles array
          const towerIdx = this.projectiles.indexOf(projectile);
          if (towerIdx !== -1) this.projectiles.splice(towerIdx, 1);
        }, fireLifespan);
      }
    });

    // Add to game logic projectiles for collision detection
    if (!this.scene.gameLogic.projectiles) this.scene.gameLogic.projectiles = [];
    this.scene.gameLogic.projectiles.push(projectile);
    this.projectiles.push(projectile);
  }

  // Override fire method from ProjectileTower (we don't use the standard fire method)
  fire(enemies, currentTime) {
    // Handled in update() instead
  }

  // Override shootProjectile (we don't use this)
  shootProjectile(target) {
    // Not used - using throwFire instead
  }
}
