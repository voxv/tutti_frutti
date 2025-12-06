import { Tower } from "./Tower.js";

export class ProjectileTower extends Tower {
  constructor(config = {}) {
    // Use the type from config if provided, otherwise default to 'projectile'
    super({ ...config, type: config.type || "projectile" });
    this.projectiles = [];
    // Track when each bloon enters range
    this._bloonEntryTimes = new Map(); // enemy -> timestamp
    this.targetingPriority = config.targetingPriority || 'First';
  }

  acquireTarget(enemies) {
    // Track entry times for all bloons
    const now = Date.now();
    const inRange = new Set();
    for (const enemy of enemies) {
      if (enemy && enemy.isActive && this.isInRange(enemy)) {
        inRange.add(enemy);
        if (!this._bloonEntryTimes.has(enemy)) {
          this._bloonEntryTimes.set(enemy, now);
        }
      }
    }
    // Remove entry times for bloons no longer in range
    for (const enemy of this._bloonEntryTimes.keys()) {
      if (!inRange.has(enemy)) {
        this._bloonEntryTimes.delete(enemy);
      }
    }
    // Default to 'First' if not set
    const priority = this.targetingPriority || 'First';
    const candidates = Array.from(inRange);
    if (candidates.length === 0) {
      this.target = null;
      return null;
    }
    let target = null;
    if (priority === 'First') {
      // Find the bloon that is furthest along the path (about to exit range next)
      target = candidates.reduce((furthest, e) => (e.progress > furthest.progress ? e : furthest), candidates[0]);
    } else if (priority === 'Last') {
      // Find the bloon that entered range most recently
      target = candidates.reduce((newest, e) => {
        return (this._bloonEntryTimes.get(e) > this._bloonEntryTimes.get(newest)) ? e : newest;
      }, candidates[0]);
      // If multiple have the same entry time, pick the one least along the path (furthest behind)
      const maxTime = this._bloonEntryTimes.get(target);
      const maxCandidates = candidates.filter(e => this._bloonEntryTimes.get(e) === maxTime);
      if (maxCandidates.length > 1) {
        target = maxCandidates.reduce((least, e) => (e.progress < least.progress ? e : least), maxCandidates[0]);
      }
    } else if (priority === 'Strong') {
      // Bloon that would cause the most damage if it leaks (default to 1 if undefined)
      target = candidates.reduce((max, e) => {
        const eDamage = typeof e.damage === 'number' ? e.damage : 1;
        const maxDamage = typeof max.damage === 'number' ? max.damage : 1;
        return (eDamage > maxDamage ? e : max);
      }, candidates[0]);
    } else {
      target = candidates[0];
    }
    this.target = target;
    return target;
  }

  fire(enemies, currentTime) {
    if (!this.target || !this.isInRange(this.target)) {
      this.acquireTarget(enemies);
    }
    // ...existing code for firing projectiles...
    // Example placeholder:
    // let projectile = ...
    // this.projectiles.push(projectile);
    // Visualization: pulse effect
    if (typeof window.sceneRef === 'object' && window.sceneRef) {
      const pulse = window.sceneRef.add.circle(this.position.x, this.position.y, this.range * 0.5, 0xff8800, 0.4);
      pulse.setDepth(3000);
      window.sceneRef.tweens.add({
        targets: pulse,
        alpha: 0,
        scale: 2,
        duration: 200,
        onComplete: () => pulse.destroy()
      });
    }
  }

  update(deltaTime, enemies) {
    let currentTime = Date.now() / 1000;
    this.fire(enemies, currentTime);
  }
}
