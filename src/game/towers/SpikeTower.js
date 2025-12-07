import { ProjectileTower } from "./ProjectileTower.js";
import { addSpikeProjectile } from "./spikeProjectile.js";

export class SpikeTower extends ProjectileTower {


    applyUpgrade(upgradeKey) {
        console.log(`[SpikeTower] applyUpgrade called:`, { upgradeKey, pos: this.position, id: this._debugId, before: this._fatSpikes });
      // Behave the same as CannonTower and other towers
      if (upgradeKey === 'bigger_range') {
        this.range += 10;
        if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
          this._placedSprite.towerRange = this.range;
        }
      } else if (upgradeKey === 'even_bigger_range') {
        this.range += 10;
        if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
          this._placedSprite.towerRange = this.range;
        }
      } else if (upgradeKey === 'more_spikes') {
        this._moreSpikes = true;
      } else if (upgradeKey === 'faster_spikes') {
        this.fireRate += 0.2;
      } else if (upgradeKey === 'super_fast_spikes') {
        this.fireRate += 0.2;
      } else if (upgradeKey === 'fat_spikes') {
        this._fatSpikes = true;
      }
      // Add more spike-specific upgrades here if needed
      this.upgrades = this.upgrades || [];
      this.upgrades.push(upgradeKey);
      console.log(`[SpikeTower] applyUpgrade finished:`, { upgradeKey, pos: this.position, id: this._debugId, after: this._fatSpikes });
    }
  fire(enemies, currentTime) {
    // No animation logic here; handled only when a spike is actually thrown
  }

    static placeOnScene(scene, x, y) {
      // Get range and config from scene.towerConfig if available
      let range = 110;
      let config = {};
      if (scene && scene.towerConfig && scene.towerConfig.spike) {
        config = { ...scene.towerConfig.spike };
        if (scene.towerConfig.spike.range) range = scene.towerConfig.spike.range;
      }
      const tower = new SpikeTower({ position: { x, y }, range, ...config });
      const cellWidth = 100;
      const cellHeight = 100;
      // Make the placed sprite smaller (e.g., 0.4x instead of 0.6x)
      const placedSprite = scene.add.sprite(x, y, 'spike_placed', 0)
        .setDisplaySize(64, 64)
        .setDepth(1001)
        .setAlpha(1)
        .setInteractive({ useHandCursor: true });
      // Guarantee the sprite is set to the first frame and not animating
      if (placedSprite.anims) {
        placedSprite.anims.stop();
      }
      placedSprite.setFrame(0);
      placedSprite.towerType = 'spike';
      placedSprite.towerX = x;
      placedSprite.towerY = y;
      placedSprite.towerRange = range;
      tower._placedSprite = placedSprite;
      // Store scene reference for spike throwing
      tower.scene = scene;
      // Do not play idle animation on placement; only animate when firing
      return tower;
    }
  constructor(config = {}) {
    super({
      ...config,
      type: "projectile"
    });
    this.lastSpikeTime = 0;
    this.fireCooldown = 0; // Initialize to 0 so tower fires immediately
    this._spikeShootingDisabled = true; // Default to disabled until wave starts
    this._fatSpikes = false; // Only true after upgrade
    // Assign a debug id for tracing
    this._debugId = Math.floor(Math.random() * 1000000);
  }

  update(deltaTime, enemies, path) {
    // DEBUG
    if (!window._spikeDebugLog) {
      window._spikeDebugLog = {};
    }
    
    // Only allow firing if not disabled (wave must be running)
    if (this._spikeShootingDisabled) {
      if (window._spikeDebugLog.disabled === undefined) {
        console.log('[SpikeTower] DEBUG: _spikeShootingDisabled is TRUE');
        window._spikeDebugLog.disabled = true;
      }
      return;
    }
    window._spikeDebugLog.disabled = false;
    
    // Get path points from the scene if not provided
    let pathPoints = path;
    if ((!pathPoints || !Array.isArray(pathPoints) || pathPoints.length === 0) && this.scene && this.scene.pathPoints) {
      pathPoints = this.scene.pathPoints;
    }
    
    // Guard: require all necessary scene properties to be available
    if (!pathPoints || !Array.isArray(pathPoints) || pathPoints.length === 0) {
      if (window._spikeDebugLog.pathPoints === undefined) {
        console.log('[SpikeTower] DEBUG: pathPoints missing or empty');
        window._spikeDebugLog.pathPoints = false;
      }
      return;
    }
    window._spikeDebugLog.pathPoints = true;
    
    if (!this.scene || !this.scene.spline) {
      if (window._spikeDebugLog.sceneSpline === undefined) {
        console.log('[SpikeTower] DEBUG: scene or spline missing', { hasScene: !!this.scene, hasSpline: !!this.scene?.spline });
        window._spikeDebugLog.sceneSpline = false;
      }
      return;
    }
    window._spikeDebugLog.sceneSpline = true;
    
    // Decrement cooldown first
    if (this.fireCooldown && this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }
    
    // Only throw spike if cooldown is ready and there are path points
    if ((this.fireCooldown === undefined || this.fireCooldown === 0 || this.fireCooldown <= 0) && pathPoints && pathPoints.length > 0 && this.scene && this.scene.spline) {
      if (window._spikeDebugLog.cooldownReady === undefined) {
        console.log('[SpikeTower] DEBUG: cooldown ready, about to throw spikes', { fireCooldown: this.fireCooldown });
        window._spikeDebugLog.cooldownReady = true;
      }
      // Find all points along the spline (road) within the tower's range
      const pointsOnSpline = [];
      const numSamples = 100;
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const pt = this.scene.spline.getPoint(t);
        if (!pt) continue;
        const dx = pt.x - this.position.x;
        const dy = pt.y - this.position.y;
        if (Math.sqrt(dx * dx + dy * dy) <= this.range) {
          pointsOnSpline.push({ x: pt.x, y: pt.y });
        }
      }
      if (pointsOnSpline.length > 0) {
        const spikesToThrow = this._moreSpikes ? 2 : 1;
        for (let n = 0; n < spikesToThrow; n++) {
          let spikePos = pointsOnSpline[Math.floor(Math.random() * pointsOnSpline.length)];
          // Add a small random vertical offset for more visual randomness
          const verticalOffset = (Math.random() - 0.5) * 12; // -6 to +6 px
          spikePos = { x: spikePos.x, y: spikePos.y + verticalOffset };
          // Check for existing spikes at this position and offset if needed
          if (this.scene && this.scene.spikeProjectiles) {
            const tooClose = this.scene.spikeProjectiles.some(spike => {
              const dx = spike.x - spikePos.x;
              const dy = spike.y - spikePos.y;
              return Math.sqrt(dx * dx + dy * dy) < 4; // 4px threshold
            });
            if (tooClose) {
              // Add a small random offset (±6px)
              const angle = Math.random() * 2 * Math.PI;
              const offset = 6 + Math.random() * 4; // 6-10px
              spikePos = {
                x: spikePos.x + Math.cos(angle) * offset,
                y: spikePos.y + Math.sin(angle) * offset
              };
            }
          }
          this.throwSpike(spikePos);
        }
        this.lastSpikeTime = performance.now();
        this.fireCooldown = 1 / (this.fireRate || 1);
        // Animate when shooting: play exactly twice (call play twice, never loop)
        if (this._placedSprite && this._placedSprite.anims) {
          const animKey = 'spike_tower_idle';
          // Defensive: stop any animation and set to frame 0 before animating
          if (this._placedSprite.anims) {
            this._placedSprite.anims.stop();
          }
          this._placedSprite.setFrame(0);
          this._placedSprite.play(animKey, true);
          const animDuration = (this._placedSprite.anims.currentAnim?.frameRate ? (1000 / this._placedSprite.anims.currentAnim.frameRate) * (this._placedSprite.anims.currentAnim.frames.length) : 300);
          setTimeout(() => {
            if (this._placedSprite && this._placedSprite.anims) {
              this._placedSprite.anims.stop();
            }
            if (this._placedSprite && this._placedSprite.setFrame) {
              this._placedSprite.setFrame(0);
            }
          }, animDuration);
        }
      }
    }
    if (this.fireCooldown && this.fireCooldown > 0) {
      this.fireCooldown -= deltaTime;
    }
    super.update(deltaTime, enemies, path);
  }

  throwSpike(position) {
    // Animate spike flying from tower to the target position
    const startX = this.position.x;
    const startY = this.position.y;
    const endX = position.x;
    const endY = position.y;
    // Create the spike at the tower's position, but do not activate yet
    const spike = this.scene.add.sprite(startX, startY, 'spike_projectile');
    spike.setDepth(2000);
    const size = this._fatSpikes ? 47 : 24;
    spike.setDisplaySize(size, size);
    if (this._fatSpikes) spike.setTint(0xff00ff);
    spike.damage = this.damage;
    spike.active = false; // Not active until it lands
    spike.hitRadius = size;
    spike._hasHit = new Set();
    if (this._fatSpikes) spike.remainingPops = 2;
    // Animate the spike flying to the target
    this.scene.tweens.add({
      targets: spike,
      x: endX,
      y: endY,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        spike.active = true;
        // Add to spikeProjectiles array for collision
        if (!this.scene.spikeProjectiles) this.scene.spikeProjectiles = [];
        this.scene.spikeProjectiles.push(spike);
      }
    });
  }
}
