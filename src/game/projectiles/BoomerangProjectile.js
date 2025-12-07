import { Projectile } from "./Projectile.js";

export class BoomerangProjectile extends Projectile {
  constructor({ position, towerPosition, speed, texture, sourceTower, arcDuration, flipArc = false, arcRadius = 120, verticalScale = 0.5, destroyOnReturn = true }) {
    super({ position, direction: { x: 0, y: 0 }, speed, damage: 0, texture });
    this.towerPosition = { ...towerPosition };
    this.sourceTower = sourceTower;
    this.totalTime = 0;
    this.arcRadius = arcRadius; // Distance of the arc
    this.arcDuration = arcDuration || 1.2; // Time to complete the arc (seconds)
    this.verticalScale = verticalScale; // vertical axis scale for arc
    this.returning = false;
    this.flipArc = flipArc;
    // Store the true start position at spawn
    this._startPosition = { x: position.x, y: position.y };
    this.destroyOnReturn = destroyOnReturn;
  }

  update(deltaTime) {
    if (!this.isActive) return;
    this.totalTime += deltaTime;
    // Calculate progress (0 to 1)
    let t = this.totalTime / this.arcDuration;
    if (t > 1) t = 1;
    // Arc path: parametric equation for circle centered on tower
    // Outward: angle from 0 to PI, Return: PI to 2PI
    let angle = Math.PI * t;
    if (this.returning) angle = Math.PI + Math.PI * t;
    // Center of ellipse is offset to the left or right
    let cx = this.towerPosition.x - 128;
    if (this.flipArc) {
      cx = this.towerPosition.x + 128;
    }
    const cy = this.towerPosition.y;
    // Ellipse: horizontal radius = arcRadius, vertical radius = arcRadius * verticalScale
    const ellipseA = this.arcRadius;
    const ellipseB = this.arcRadius * this.verticalScale;
    // Flip arc horizontally if needed
    const x = cx + (this.flipArc ? -1 : 1) * ellipseA * Math.cos(angle);
    const y = cy + ellipseB * Math.sin(angle);
    this.position.x = x;
    this.position.y = y;
    if (this.sprite) {
      this.sprite.x = x;
      this.sprite.y = y;
      // Rotate the boomerang as it travels
      this.sprite.rotation += 0.25;
      // Prevent destruction by animation stop; only destroy when path completes
      if (!this.isActive && this.sprite.visible) {
        this.sprite.visible = false;
        try { this.sprite.destroy(); } catch (e) {}
        this.sprite = null;
      }
    }
    // Check collision with fruits and pop them
    if (typeof window !== 'undefined' && window.sceneRef && Array.isArray(window.sceneRef.gameLogic?.enemies)) {
      for (const fruit of window.sceneRef.gameLogic.enemies) {
        if (!fruit || !fruit.isActive) continue;
        // Use projectile's hitRadius if available, otherwise default to 36
        const hitRadius = this.hitRadius || 36;
        const dx = this.position.x - fruit.position.x;
        const dy = this.position.y - fruit.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitRadius) {
          if (typeof fruit.takeDamage === 'function') fruit.takeDamage(1);
        }
      }
    }
    // If finished outward arc, start returning
    if (!this.returning && t >= 1) {
      this.returning = true;
      this.totalTime = 0;
    }
    // If returning, check if close to tower position and destroy
    if (this.returning && this.destroyOnReturn) {
      // Calculate distance to starting position (where boomerang was spawned)
      const distToStart = Math.hypot(this.position.x - this._startPosition.x, this.position.y - this._startPosition.y);
      if (distToStart < 34) {
        this.isActive = false;
        // Always attempt to destroy sprite, even if already destroyed
        if (this.sprite) {
          this.sprite.visible = false;
          try { this.sprite.destroy(); } catch (e) {}
          this.sprite = null;
        }
        // Remove from gameLogic.projectiles array if present
        if (typeof window !== 'undefined' && window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
          const idx = window.sceneRef.gameLogic.projectiles.indexOf(this);
          if (idx !== -1) window.sceneRef.gameLogic.projectiles.splice(idx, 1);
        }
      }
    }
  }

  onHit(enemy) {
    // Do nothing: boomerang does not destroy on hit
  }
}
