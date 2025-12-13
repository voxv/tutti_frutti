import { ProjectileTower } from "./ProjectileTower.js";
import towerDefaults from "./tower.json";
import projectileDefaults from "../projectiles.json";
import { BoulderProjectile } from "../projectiles/BoulderProjectile.js";

export class SniperTower extends ProjectileTower {
  constructor(config = {}) {
    let defaults = { range: 180, fireRate: 1.2, damage: 2, cost: 280, type: "projectile", homing: true };
    if (towerDefaults && towerDefaults.sniper) {
      defaults = { ...defaults, ...towerDefaults.sniper };
    }
    super({
      ...defaults,
      ...config,
      type: "projectile"
    });
    this.projectileTexture = 'boulder';
    this.homing = config.homing !== undefined ? config.homing : defaults.homing;
    this._pendingDrops = []; // Track pending drop events
  }

  applyUpgrade(upgradeKey) {
    if (upgradeKey === 'bigger_range' || upgradeKey === 'even_bigger_range') {
      this.range += 52;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'extreme_range') {
      this.range += 200;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'rapid_fire') {
      this.fireRate += 0.5; // Increase fire rate by 0.5
      if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
        this._placedSprite.towerFireRate = this.fireRate;
      }
    } else if (upgradeKey === 'piercing_shot') {
      // Piercing shot modifier (can be used in damage calculation)
      this._piercingShot = true;
    } else if (upgradeKey === 'headshot') {
      // Increase fire rate by 0.5 for headshot upgrade
      this.fireRate += 0.5;
      // Instant destroy modifier
      this._headshot = true;
      if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
        this._placedSprite.towerFireRate = this.fireRate;
      }
    }
    this.upgrades.push(upgradeKey);
  }

  update(deltaTime, enemies) {
    let currentTime = Date.now() / 1000;
    // Check if any bloons are in range
    const anyInRange = enemies && enemies.some(e => e && e.isActive && this.isInRange(e));
    if (!anyInRange && this._placedSprite) {
      if (this._placedSprite.anims && this._placedSprite.anims.isPlaying) {
        this._placedSprite.anims.stop();
      }
      if (typeof this._placedSprite.setFrame === 'function') {
        this._placedSprite.setFrame(0);
      }
    }
    this.fire(enemies, currentTime);
  }

  static placeOnScene(scene, x, y, towerConfig = {}) {
    let range = 180;
    if (towerConfig && towerConfig.sniper && towerConfig.sniper.range) {
      range = towerConfig.sniper.range;
    }
    const tower = new SniperTower({ position: { x, y } });
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    // Use spritesheet for sniper placed sprite
    const frameWidth = 280; // 840 / 3
    const frameHeight = 155; // 465 / 3
    const placedSprite = scene.add.sprite(x, y, 'sniper_placed', 0)
      .setDisplaySize(frameWidth * 0.27, frameHeight * 0.45)
      .setDepth(8500)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'sniper';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    return tower;
  }

  fire(enemies, currentTime) {
    // Always reacquire the first in-range bloon before firing
    this.acquireTarget(enemies);
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      // Play sniper placed sprite animation if it exists
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.anims.play('sniper_placed', true);
      }
      const projConfig = projectileDefaults.boulder || { speed: 400, hitRadius: 36, sprite: 'boulder' };
      // Shoot boulder upwards from sniper position
      const startOffset = { x: this.position.x, y: this.position.y - 20 };
      // Direction: straight up (to go off screen)
      const dir = { x: 0, y: -1 };
      
      // Create projectile that shoots upwards
      const projectile = new BoulderProjectile({
        position: { ...startOffset },
        direction: dir,
        speed: 1300, // Faster upward trajectory
        damage: this.damage,
        texture: this.projectileTexture,
        target: null, // No target for initial upward shot
        hitRadius: projConfig.hitRadius,
        homing: false,
        maxHits: 1,
        showExplosion: false
      });
      
      const sprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, 'sniper_projectile');
      sprite.setDisplaySize(13, 13);
      sprite.setScale(0.3);
      sprite.setFlipY(true); // Flip vertically for upward trajectory
      sprite.setDepth(3001);
      projectile.sprite = sprite;
      
      // Schedule drop check when projectile goes off-screen
      this._scheduleDelayedDrop(projectile, enemies);
      
      this.projectiles.push(projectile);
      // Also push to global gameLogic.projectiles for update/render
      if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
        window.sceneRef.gameLogic.projectiles.push(projectile);
      }
    }
  }

  _scheduleDelayedDrop(projectile, enemies) {
    // Capture enemies list at firing time for use in the delayed drop
    const capturedEnemies = enemies ? [...enemies] : [];
    
    // Track this projectile until it goes off-screen
    const checkInterval = setInterval(() => {
      if (!projectile.sprite || projectile.sprite.y < -50) {
        // Projectile went off-screen, clear interval
        clearInterval(checkInterval);
        
        // Destroy the upward projectile's sprite since we no longer need it
        if (projectile.sprite) {
          projectile.sprite.destroy();
          projectile.sprite = null;
        }
        projectile.isActive = false;
        
        // Wait 2 seconds, then check if there are fruits on the path
        const dropTimeout = setTimeout(() => {
          if (window.sceneRef && window.sceneRef.gameLogic) {
            // Get current active enemies from the game logic
            const currentEnemies = window.sceneRef.gameLogic.enemies || [];
            
            // Find fruits currently in range
            const fruitsInRange = currentEnemies.filter(e => e && e.isActive && this.isInRange(e));
            let dropX = this.position.x; // Default to tower position
            let targetBloon = null;
            
            if (fruitsInRange && fruitsInRange.length > 0) {
              // Pick target based on player's targeting priority
              targetBloon = this._findTargetBloon(fruitsInRange, null);
              if (targetBloon && targetBloon.position) {
                dropX = targetBloon.position.x;
              }
            } else if (window.sceneRef && window.sceneRef.pathPoints && window.sceneRef.pathPoints.length > 0) {
              // No fruits in range - pick random point on path near tower
              const pathPoint = window.sceneRef.pathPoints[Math.floor(Math.random() * window.sceneRef.pathPoints.length)];
              dropX = pathPoint.x + (Math.random() - 0.5) * 60; // +/- 30 pixels from path point
            }
            
            // Create drop projectile with homing enabled
            const dropProjectile = new BoulderProjectile({
              position: { x: dropX, y: -100 }, // Start above screen at target's X position or random path
              direction: { x: 0, y: 1 }, // Initial fall downward
              speed: 300,
              // Headshot: one-shot normal, but not boss
              damage: (this._headshot && targetBloon && (targetBloon.type !== 'boss' && targetBloon.constructor.name !== 'BossBloon'))
                ? this.damage * 999
                : (this._headshot ? this.damage * 10 : this.damage),
              texture: this.projectileTexture,
              target: targetBloon, // Set target for homing if in range, null otherwise
              hitRadius: 36,
              homing: true, // Always enable homing for dropped projectiles
              maxHits: this._piercingShot ? 3 : 1,
              showExplosion: true // Show explosion on impact
            });
            // Explicitly ensure position is set to the calculated dropX
            dropProjectile.position = { x: dropX, y: -100 };
            dropProjectile.sourceTower = this; // Set source tower for collision detection
            dropProjectile.isSniperDrop = true; // Mark as sniper drop for path collision
            dropProjectile.piercingShot = this._piercingShot || false; // Explicitly set piercing shot flag
            
            const dropSprite = window.sceneRef.add.sprite(dropX, -100, 'sniper_projectile');
            dropSprite.setDisplaySize(13, 13);
            dropSprite.setScale(0.3);
            // Don't flip for downward trajectory - keep normal orientation
            dropSprite.setDepth(3001);
            dropProjectile.sprite = dropSprite;
            
            this.projectiles.push(dropProjectile);
            if (window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
              window.sceneRef.gameLogic.projectiles.push(dropProjectile);
            }
          }
          
          // Clean up the pending drop
          const idx = this._pendingDrops.indexOf(dropTimeout);
          if (idx !== -1) {
            this._pendingDrops.splice(idx, 1);
          }
        }, 2000); // 2 second delay
        
        this._pendingDrops.push(dropTimeout);
      }
    }, 50); // Check every 50ms if projectile is off-screen
  }

  _findTargetBloon(enemies, referencePoint) {
    if (!enemies || enemies.length === 0) return null;
    
    const activeEnemies = enemies.filter(e => e && e.isActive);
    if (activeEnemies.length === 0) return null;
    
    // Use the tower's targeting priority (or default to 'First')
    const priority = this.targetingPriority || 'First';
    
    if (priority === 'First') {
      // Find the bloon that is furthest along the path (about to exit range next)
      return activeEnemies.reduce((furthest, e) => (e.progress > furthest.progress ? e : furthest), activeEnemies[0]);
    } else if (priority === 'Last') {
      // Find the bloon that is least along the path (furthest behind)
      return activeEnemies.reduce((least, e) => (e.progress < least.progress ? e : least), activeEnemies[0]);
    } else if (priority === 'Strong') {
      // Find the bloon that would cause the most damage if it leaks (highest health/damage)
      return activeEnemies.reduce((max, e) => {
        const eDamage = typeof e.damage === 'number' ? e.damage : 1;
        const maxDamage = typeof max.damage === 'number' ? max.damage : 1;
        return (eDamage > maxDamage ? e : max);
      }, activeEnemies[0]);
    } else {
      // Default: pick closest to reference point
      return activeEnemies.reduce((closest, e) => {
        const distC = Math.hypot(closest.position.x - referencePoint.x, closest.position.y - referencePoint.y);
        const distE = Math.hypot(e.position.x - referencePoint.x, e.position.y - referencePoint.y);
        return distE < distC ? e : closest;
      }, activeEnemies[0]);
    }
  }
}
