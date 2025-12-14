import { Enemy } from "../../engine/entities/Enemy.js";
import { Vector2 } from "../../engine/core/Vector2.js";

export class Bloon extends Enemy {
  constructor(path, {
    level = 1,
    nextType = null,
    nextTypes = [],
    speed = 50,
    reward = 1,
    spawnDelay = 0,
    color = 0xffffff,
    size = 20,
    image = null,
    spritesheet = null,
    frameCount = 1,
    frameWidth = null,
    frameHeight = null,
    health = 1,
    damage = 1,
    type = null
  } = {}) {
    super();
    this.path = path;
    this.position = new Vector2(path.waypoints[0].x, path.waypoints[0].y);
    this.level = level;
    this.nextType = nextType;
    // Support array of child types (for multiple children on pop)
    this.nextTypes = nextTypes || (nextType ? [nextType] : []);
    this.speed = speed;
    this.reward = reward;
    this.progress = 0;
    this.distanceTraveled = 0;
    this.splineLength = (this.path.spline && typeof this.path.spline.getLength === 'function') ? this.path.spline.getLength() : 1;
    // Precompute lookup table for constant speed
    this._progressLookup = [];
    if (this.path.spline && typeof this.path.spline.getPoint === 'function') {
      const steps = 200;
      let lastPos = this.path.spline.getPoint(0);
      let totalDist = 0;
      this._progressLookup.push({ progress: 0, distance: 0 });
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pos = this.path.spline.getPoint(t);
        const dx = pos.x - lastPos.x;
        const dy = pos.y - lastPos.y;
        totalDist += Math.sqrt(dx * dx + dy * dy);
        this._progressLookup.push({ progress: t, distance: totalDist });
        lastPos = pos;
      }
      this.splineLength = totalDist;
    }
    this.isActive = true;
    this.spawnDelay = spawnDelay;
    this.spawnTimer = 0;
    this.started = false;
    this.color = color;
    this.size = size;
    this.image = image;
    this.spritesheet = spritesheet;
    this.frameCount = frameCount;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.health = health;
    this.maxHealth = health; // Store max health for health bar calculations
    this.type = type;
    // Animation state
    this.animFrame = 0;
    this.animPlaying = false;
    this.animTimer = 0;
    this._destroyAnimStarted = false;

    // Damage property (used when bloon escapes)
    this.damage = damage !== undefined ? damage : 1;
  }

  // Apply a slow effect (reduces speed for a duration)
  applySlow(slowAmount = 0.5, duration = 2.5) {
    if (!this._originalSpeed) this._originalSpeed = this.speed;
    this.speed = this._originalSpeed * (1 - slowAmount);
    if (this._slowTimeout) clearTimeout(this._slowTimeout);
    this._slowTimeout = setTimeout(() => {
      this.speed = this._originalSpeed;
      this._slowTimeout = null;
    }, duration * 1000);
    // Optionally tint the sprite to indicate slow
    if (this._sprite) {
      this._sprite.setTint(0x00bfff); // light blue
      setTimeout(() => {
        if (this._sprite) this._sprite.clearTint();
      }, duration * 1000);
    }
  }

  // Tornado knockback: push bloon backward for a short time
  knockback(duration = 0.5, speedMultiplier = 3) {
    if (this._knockbackTimer) return; // Already being knocked back
    this._knockbackTimer = duration;
    this._knockbackSpeed = (this._originalSpeed || this.speed) * speedMultiplier;
    this._knockbackDirection = -1; // Move backward
    if (this._sprite) {
      this._sprite.setTint(0x00ffcc); // Cyan tint for knockback
    }
  }

  update(deltaTime) {
    // --- Knockback logic ---
    if (this._knockbackTimer && this._knockbackTimer > 0) {
      this._knockbackTimer -= deltaTime;
      const speedMultiplier = (typeof window !== 'undefined' && window.BLOON_SPEED_MULTIPLIER) ? window.BLOON_SPEED_MULTIPLIER : 1;
      this.distanceTraveled -= this._knockbackSpeed * speedMultiplier * deltaTime;
      if (this.distanceTraveled < 0) this.distanceTraveled = 0;
      this.progress = this._distanceToProgress(this.distanceTraveled);
      let pos = null;
      if (this.path.spline && typeof this.path.spline.getPoint === 'function') {
        pos = this.path.spline.getPoint(this.progress);
      }
      if (pos) {
        this.position.x = pos.x;
        this.position.y = pos.y;
      }
      if (this._knockbackTimer <= 0) {
        this._knockbackTimer = 0;
        this._knockbackSpeed = 0;
        this._knockbackDirection = 1;
        if (this._sprite) this._sprite.clearTint();
      }
      return;
    }
    // --- Freeze logic ---
    if (this._frozenUntil && Date.now() < this._frozenUntil) {
      // If frozen, skip movement and keep bright white tint
      if (this._sprite) {
        this._sprite.setTint(0xffffff);
        this._sprite.setAlpha(0.8);
      }
      return;
    } else if (this._wasFrozen) {
      // Unfreeze: restore tint
      if (this._sprite) {
        this._sprite.clearTint();
        this._sprite.setAlpha(1);
      }
      this._wasFrozen = false;
      this._frozenUntil = null;
    }
    // If destroy animation is playing, keep moving (but NOT if abducted)
    if (!this.isActive && this.animPlaying && !this.isAbducted) {
      const speedMultiplier = (typeof window !== 'undefined' && window.BLOON_SPEED_MULTIPLIER) ? window.BLOON_SPEED_MULTIPLIER : 1;
      this.distanceTraveled += this.speed * speedMultiplier * deltaTime;
      let clampedDistance = Math.min(this.distanceTraveled, this.splineLength);
      this.progress = this._distanceToProgress(clampedDistance);
      let pos = null;
      if (this.path.spline && typeof this.path.spline.getPoint === 'function') {
        pos = this.path.spline.getPoint(this.progress);
      }
      if (pos) {
        this.position.x = pos.x;
        this.position.y = pos.y;
      }
      return;
    }
    if (!this.isActive) return;
    if (!this.started) {
      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= this.spawnDelay) {
        this.started = true;
      } else {
        return; // Don't move until delay has passed
      }
    }
    // Move along the spline path at constant speed, unless being abducted
    let clampedDistance = null;
    if (!this.isAbducted) {
      const speedMultiplier = (typeof window !== 'undefined' && window.BLOON_SPEED_MULTIPLIER) ? window.BLOON_SPEED_MULTIPLIER : 1;
      this.distanceTraveled += this.speed * speedMultiplier * deltaTime;
      clampedDistance = Math.min(this.distanceTraveled, this.splineLength);
      this.progress = this._distanceToProgress(clampedDistance);
      let pos = null;
      if (this.path.spline && typeof this.path.spline.getPoint === 'function') {
        pos = this.path.spline.getPoint(this.progress);
      }
      if (pos) {
        this.position.x = pos.x;
        this.position.y = pos.y;
      }
    }

    // Check if bloon has gone offscreen - mark as inactive immediately
    // Game area: 1600px wide (minus 220px shop), 900px tall (minus 100px info bar)
    const isOffscreen = this.position.x < 0 || this.position.x > 1380 || this.position.y < 0 || this.position.y > 800;
    if (isOffscreen) {
      if (!this._offscreenLogged) {
        this._offscreenLogged = true;
      }
      this.isActive = false;
      return;
    }

    if (clampedDistance !== null && clampedDistance >= this.splineLength) {
      this.progress = 1;
      this.isActive = false;
    }
  }

  // Lookup table: convert distance to progress for constant speed
  _distanceToProgress(distance) {
    if (!this._progressLookup || this._progressLookup.length === 0) return distance / this.splineLength;
    for (let i = 1; i < this._progressLookup.length; i++) {
      if (distance <= this._progressLookup[i].distance) {
        const prev = this._progressLookup[i - 1];
        const curr = this._progressLookup[i];
        // Linear interpolation between prev and curr
        const ratio = (distance - prev.distance) / (curr.distance - prev.distance);
        return prev.progress + ratio * (curr.progress - prev.progress);
      }
    }
    return 1;
  }

  takeDamage(amount) {
    if (!this.isActive) return;
    // Skip damage if fruit is being abducted
    if (this.isAbducted) return;
    // Track if destroyed by sharper_blade logic
    let destroyedBySharperBlade = false;
    if (amount && typeof amount === 'object' && amount.sharperBlade) {
      // Exception: do NOT one-shot boss bloons
      if (this.type === 'boss' || this.constructor.name === 'BossBloon') {
        // Apply normal damage (default to 1 if not specified)
        this.health -= 1;
        this._laserDestroyed = false;
      } else {
        this.health = 0;
        destroyedBySharperBlade = true;
        this._laserDestroyed = false;
      }
    } else if (amount === 'LASER_KILL') {
      this.health = 0;
      this._laserDestroyed = true;
      destroyedBySharperBlade = false;
    } else if (amount === 'SHARPER_BLADE_CHAIN') {
      this.health = 0;
      this._laserDestroyed = false;
      destroyedBySharperBlade = true;
    } else {
      // Exception: do NOT one-shot boss bloons with overkill damage
      // BirdTower devastation: apply bonus damage to boss bloons for all devastation levels
      if ((typeof amount === 'number' && amount >= 9999) && (this.type === 'boss' || this.constructor.name === 'BossBloon')) {
        // If a sourceTower is provided, use its damage property; otherwise, default to 1
        let normalDamage = 1;
        if (arguments.length > 1 && arguments[1] && arguments[1].damage !== undefined) {
          normalDamage = arguments[1].damage;
        }
        this.health -= normalDamage * 10; // 10x damage for devastation
      } else {
        this.health -= amount;
      }
      this._laserDestroyed = false;
    }
    if (this.health <= 0) {
      this.isActive = false;
      // Play destruction sound
      if (typeof window !== 'undefined' && window.sceneRef && window.sceneRef.sound) {
        const now = Date.now();
        if (!window.sceneRef._lastSquirtSoundTime || now - window.sceneRef._lastSquirtSoundTime > 30) {
          window.sceneRef.sound.play('squirt', { volume: 1 });
          window.sceneRef._lastSquirtSoundTime = now;
        }
      }
      // Award gold if not at end and not already rewarded
      if (
        typeof window !== 'undefined' &&
        window.sceneRef &&
        typeof window.sceneRef.goldAmount === 'number' &&
        !(this.isAtEnd && this.isAtEnd()) &&
        !this._goldAwarded
      ) {
        window.sceneRef.goldAmount += this.reward || 0;
        if (window.sceneRef.goldText) {
          window.sceneRef.goldText.setText(String(window.sceneRef.goldAmount));
        }
        if (typeof window.sceneRef._refreshShopAvailability === 'function') {
          window.sceneRef._refreshShopAvailability();
        }
        if (typeof window.sceneRef.refreshUpgradeUIIfVisible === 'function') {
          window.sceneRef.refreshUpgradeUIIfVisible();
        }
        this._goldAwarded = true;
      }
      // Mark for spawning child bloons after animation (supports multiple children)
      this._shouldSpawnNextBloons = true;
      this._childrenToSpawn = this.nextTypes || [];
      if (destroyedBySharperBlade) {
        this._destroyedBySharperBlade = true;
      }
      
      // For bloons with no animation (frameCount = 1), spawn children immediately
      if (this.frameCount <= 1 && this._childrenToSpawn?.length > 0) {
        this._spawnChildBloons().catch(err => console.error('Child spawn error:', err));
        this._shouldSpawnNextBloons = false;
      }
    }
  }

  isAtEnd() {
    // End the path slightly before the shop area (e.g., at 0.93)
    return this.progress >= 0.93;
  }

  // --- Freeze logic ---
  freeze(durationMs = 2000) {
    const now = Date.now();
    // Check if already frozen or on cooldown
    if (this._frozenUntil && this._frozenUntil > now) return; // already frozen
    if (this._freezeCooldownUntil && this._freezeCooldownUntil > now) return; // on cooldown
    
    this._frozenUntil = now + durationMs;
    this._freezeCooldownUntil = now + durationMs + 1000; // 1 second cooldown after freeze ends
    this._wasFrozen = true;
    // Tint sprite if present with bright white overlay
    if (this._sprite) {
      this._sprite.setTint(0xffffff);
      this._sprite.setAlpha(0.8);
    }
  }

  // Generic animation handler for travel/destroy
  updateAnimation(phaserSprite, delta) {
    if (!phaserSprite) return;
    // Use a fast animation rate (70ms per frame)
    const animRate = 70;
    if (!this.isActive && !this._destroyAnimStarted && this.frameCount > 1) {
      // Start destroy animation
      this.animPlaying = true;
      this.animFrame = 0;
      this.animTimer = 0;
      this._destroyAnimStarted = true;
    }
    if (this.animPlaying && this.frameCount > 1) {
      // Play destroy animation: advance frames every animRate ms
      this.animTimer += delta;
      if (this.animTimer > animRate) {
        this.animTimer = 0;
        this.animFrame++;
        if (this.animFrame >= this.frameCount) {
          // Animation finished, remove sprite
          if (phaserSprite && phaserSprite.destroy) {
            phaserSprite.destroy();
          }
          this._sprite = null;
          this.animPlaying = false;
          
          // Spawn child bloons after animation (supports multiple children)
          if (this._shouldSpawnNextBloons && this._childrenToSpawn?.length > 0) {
            // Queue child spawning - execute async without blocking
            this._spawnChildBloons().catch(err => console.error('Child spawn error:', err));
            this._shouldSpawnNextBloons = false;
          }
        } else if (phaserSprite && phaserSprite.setFrame && this.animFrame < this.frameCount) {
          phaserSprite.setFrame(this.animFrame);
        }
      }
    } else if (this.frameCount > 1 && phaserSprite && phaserSprite.setFrame) {
      // Traveling: always show frame 0
      phaserSprite.setFrame(0);
    }
  }

  /**
   * Spawn child bloons using the factory
   * Supports multiple children per bloon
   */
  async _spawnChildBloons() {
    if (!window.sceneRef || !window.bloonsConfig) {
      console.error('Missing window.sceneRef or window.bloonsConfig');
      return;
    }

    try {
      const { spawnChildBloons } = await import('../../client/factories/bloonFactory.js');
      await spawnChildBloons(
        this,
        this._childrenToSpawn,
        window.bloonsConfig,
        window.sceneRef.gameLogic
      );
    } catch (error) {
      console.error('Failed to spawn child bloons:', error);
    }
  }
}
