import { Projectile } from "./Projectile.js";

export class GlueProjectile extends Projectile {
    update(deltaTime) {
      if (!this.isActive) return;
      if (this.homing && this.target && this.target.isActive) {
        // Simple homing: update direction toward target
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          this.direction = { x: dx / mag, y: dy / mag };
        }
      }
      this.position.x += this.direction.x * this.speed * deltaTime;
      this.position.y += this.direction.y * this.speed * deltaTime;
      if (this.sprite) {
        this.sprite.x = this.position.x;
        this.sprite.y = this.position.y;
      }
      // Do NOT destroy on path collision (override base logic)
      if (this.position.x > 1380 || this.position.x < 0) {
        this.isActive = false;
        if (this.sprite) {
          this.sprite.destroy();
          this.sprite = null;
        }
      }
    }
  constructor(config) {
    super(config);
    this.slowAmount = config.slowAmount || 0.5; // 50% speed by default
    this.slowDuration = config.slowDuration || 2.5; // seconds
    this.stickinessLevel = config.stickinessLevel || 0; // How many nearby bloons to infect
    this.tower = config.tower; // Reference to the tower that fired this projectile
  }

  onHit(target) {
    if (target && typeof target.applySlow === 'function') {
      target.applySlow(this.slowAmount, this.slowDuration);
      
      // Apply stickiness: spread slow to nearby bloons
      if (this.stickinessLevel > 0 && this.tower && window.sceneRef && window.sceneRef.gameLogic) {
        this.spreadStickiness(target, this.stickinessLevel, window.sceneRef.gameLogic.enemies);
      }
    }
    // Call base class onHit for removal, etc.
    super.onHit(target);
  }

  spreadStickiness(targetBloon, spreadCount, allEnemies) {
    if (!targetBloon || !allEnemies || spreadCount <= 0) return;
    
    // Find nearby bloons within 150 pixels
    const spreadRadius = 150;
    const nearbyBloons = allEnemies.filter(enemy => {
      if (!enemy || !enemy.isActive || enemy === targetBloon) return false;
      if (!enemy.position || !targetBloon.position) return false;
      
      const dx = enemy.position.x - targetBloon.position.x;
      const dy = enemy.position.y - targetBloon.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= spreadRadius;
    });
    
    // Sort by distance to find closest bloons first
    nearbyBloons.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.position.x - targetBloon.position.x, 2) + 
        Math.pow(a.position.y - targetBloon.position.y, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.position.x - targetBloon.position.x, 2) + 
        Math.pow(b.position.y - targetBloon.position.y, 2)
      );
      return distA - distB;
    });
    
    // Apply slow to the closest N bloons (where N = spreadCount)
    for (let i = 0; i < Math.min(spreadCount, nearbyBloons.length); i++) {
      if (nearbyBloons[i] && typeof nearbyBloons[i].applySlow === 'function') {
        nearbyBloons[i].applySlow(this.slowAmount, this.slowDuration);
      }
    }
  }
}
