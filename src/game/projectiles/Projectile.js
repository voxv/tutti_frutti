export class Projectile {
  constructor({ position, direction, speed, damage, texture, target, hitRadius = 36, homing = false }) {
    this.position = { ...position };
    this.direction = direction;
    this.speed = speed;
    this.damage = damage;
    this.texture = texture;
    this.target = target;
    this.isActive = true;
    this.hitRadius = hitRadius;
    this.homing = homing;
    this.sprite = null;
  }

  onHit(enemy) {
    if (enemy && typeof enemy.takeDamage === 'function') {
      enemy.takeDamage(this.damage);
    }
    this.isActive = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }

  update(deltaTime) {
    if (!this.isActive) return;
    
    // For homing projectiles, update direction toward target
    if (this.homing) {
      // If current target is dead, try to find a new one
      if (!this.target || !this.target.isActive) {
        this.target = null;
        // Try to find a new target from nearby active enemies
        if (typeof window !== 'undefined' && window.sceneRef && window.sceneRef.gameLogic && window.sceneRef.gameLogic.enemies) {
          const nearbyEnemies = window.sceneRef.gameLogic.enemies.filter(e => 
            e && e.isActive && e.position && 
            Math.hypot(e.position.x - this.position.x, e.position.y - this.position.y) < 500
          );
          if (nearbyEnemies.length > 0) {
            // Pick the closest one
            this.target = nearbyEnemies.reduce((closest, e) => {
              const distC = Math.hypot(closest.position.x - this.position.x, closest.position.y - this.position.y);
              const distE = Math.hypot(e.position.x - this.position.x, e.position.y - this.position.y);
              return distE < distC ? e : closest;
            }, nearbyEnemies[0]);
          }
        }
      }
      
      // Home toward target if we have one
      if (this.target && this.target.isActive) {
        const dx = this.target.position.x - this.position.x;
        const dy = this.target.position.y - this.position.y;
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
          this.direction = { x: dx / mag, y: dy / mag };
        }
      }
    }
    
    this.position.x += this.direction.x * this.speed * deltaTime;
    this.position.y += this.direction.y * this.speed * deltaTime;
    if (this.sprite) {
      this.sprite.x = this.position.x;
      this.sprite.y = this.position.y;
    }
    // Disappear if off the right edge of the main play area (shop starts at x=1380)
    // Or if it hits the path (custom logic for boulder)
    const scene = typeof window !== 'undefined' ? window.sceneRef : null;
    
    // Check if projectile hits the path (for BirdTower or SniperTower drops)
    if (
      scene && scene.pathPoints &&
      (this.sourceTower?.towerType === 'bird' || this.isSniperDrop)
    ) {
      let minDist = Infinity;
      for (const pt of scene.pathPoints) {
        const dx = this.position.x - pt.x;
        const dy = this.position.y - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) minDist = dist;
      }
      if (minDist < (this.hitRadius || 36)) {
        if (typeof this.destroyOnPath === 'function') {
          this.destroyOnPath(scene);
        } else {
          this.isActive = false;
          if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
          }
        }
        return;
      }
    }
    
    if (this.position.x > 1380 || this.position.x < 0) {
      this.isActive = false;
      if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
      }
    }
  }
}
