import { AOETower } from "./AOETower.js";

export class OvniTower extends AOETower {
  constructor(config = {}) {
    super(config);
    this.abductedFruits = [];
    this.fireRate = config.fireRate || 1.0;
    this.abductCooldown = 1 / this.fireRate; // seconds between abductions
    this.abductTimer = 0;
    this.pullSpeed = 300; // px/sec, can be tuned
    this.maxAbductions = 1; // Default abduct one at a time, upgrades increase this
  }
  static placeOnScene(scene, x, y) {
    // Get config from scene.towerConfig if available
    let config = {};
    if (scene && scene.towerConfig && scene.towerConfig.ovni) {
      config = { ...scene.towerConfig.ovni };
    }
    const tower = new OvniTower({
      ...config,
      position: { x, y },
      type: "aoe",
      towerType: "ovni"
    });
    tower.scene = scene; // Store scene reference for update method
    // Placed sprite uses ovni_anim.png (4 frames, 290x212)
    const sprite = scene.add.sprite(x, y, "ovni_anim");
    sprite.setDisplaySize(106*0.06, 106*0.06); // 50% scale, adjust as needed
    sprite.setDepth(9000);
    sprite.setOrigin(0.5, 0.5);
    sprite.towerType = "ovni";
    sprite.towerX = x;
    sprite.towerY = y;
    sprite.towerRange = config.range || 120;
    tower._placedSprite = sprite;

    // Add beam sprite (hidden by default)
    const beam = scene.add.sprite(x, y + 25, "beam_anim");
      beam.setDisplaySize(45, 45); // reduced size
      beam.setAlpha(0.3); // semi-transparent beam
    beam.setDepth(8999);
    beam.setOrigin(0.5, 0);
    beam.setVisible(false);
    tower._beamSprite = beam;

    // Play animation if loaded
    if (sprite.anims && sprite.anims.animationManager && sprite.anims.animationManager.exists("ovni_idle")) {
      sprite.play("ovni_idle");
    }

    // Create beam animation globally if not already present
    if (scene.anims && !scene.anims.exists("beam_loop")) {
      scene.anims.create({
        key: "beam_loop",
        frames: scene.anims.generateFrameNumbers("beam_anim", { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
      });
    }
    return tower;
  }

  update(deltaTime, enemies) {
    // Call abduction logic every frame (like AOETower)
    let currentTime = Date.now() / 1000;
    this.fire(enemies, currentTime);

    // Move abducted fruits: first horizontally to tower x, then vertically to tower y
    if (this.abductedFruits && this.abductedFruits.length > 0) {
      for (let i = this.abductedFruits.length - 1; i >= 0; i--) {
        const obj = this.abductedFruits[i];
        const fruit = obj.fruit;
        if (!fruit.isActive) {
          this.abductedFruits.splice(i, 1);
          continue;
        }
        const targetX = this.position.x;
        const targetY = this.position.y;
        // Move horizontally first
        const dx = targetX - fruit.position.x;
        const moveX = Math.sign(dx) * Math.min(Math.abs(dx), this.pullSpeed * deltaTime);
        if (Math.abs(dx) > 1) {
          fruit.position.x += moveX;
        } else {
          fruit.position.x = targetX;
        }
        // Only move vertically if x is aligned
        if (Math.abs(fruit.position.x - targetX) < 2) {
          const dy = targetY - fruit.position.y;
          const moveY = Math.sign(dy) * Math.min(Math.abs(dy), this.pullSpeed * deltaTime);
          if (Math.abs(dy) > 1) {
            fruit.position.y += moveY;
          } else {
            fruit.position.y = targetY;
          }
        }
        if (fruit._sprite) {
          fruit._sprite.x = fruit.position.x;
          fruit._sprite.y = fruit.position.y;
        }
        // Only destroy and award gold if the fruit has reached the exact center
        if (Math.abs(fruit.position.x - targetX) < 2 && Math.abs(fruit.position.y - targetY) < 2) {
          fruit.position.x = targetX;
          fruit.position.y = targetY;
          if (fruit._sprite) {
            fruit._sprite.x = targetX;
            fruit._sprite.y = targetY;
          }
          // Mark as inactive (triggers destroy animation) but keep isAbducted true
          // so the fruit doesn't move along the path during animation
          fruit.isActive = false;
          if (typeof window !== 'undefined' && window.sceneRef && typeof window.sceneRef.goldAmount === 'number' && !fruit._goldAwarded) {
            window.sceneRef.goldAmount += fruit.reward || 0;
            if (window.sceneRef.goldText) window.sceneRef.goldText.setText(String(window.sceneRef.goldAmount));
            if (typeof window.sceneRef._refreshShopAvailability === 'function') window.sceneRef._refreshShopAvailability();
            if (typeof window.sceneRef.refreshUpgradeUIIfVisible === 'function') window.sceneRef.refreshUpgradeUIIfVisible();
            fruit._goldAwarded = true;
          }
          this.abductedFruits.splice(i, 1);
        }
      }
    }
    // Check if there are any fruits in range and collect their positions
    let hasFruitsInRange = false;
    let fruitsY = [];
    if (enemies && Array.isArray(enemies)) {
      for (const enemy of enemies) {
        if (enemy && enemy.isActive && this.isInRange(enemy)) {
          hasFruitsInRange = true;
          fruitsY.push(enemy.position.y);
        }
      }
    }

    // Control animation based on fruits in range
    if (this._placedSprite && this._placedSprite.anims) {
      const anims = this._placedSprite.anims;
      const isPlayingOvni = anims.isPlaying && anims.currentAnim && anims.currentAnim.key === "ovni_idle";
      if (hasFruitsInRange) {
        // Play animation when fruits are in range
        if (!isPlayingOvni) {
          this._placedSprite.play("ovni_idle");
        }
        // Show and animate beam
        if (this._beamSprite) {
          this._beamSprite.setVisible(true);
          // Flip beam if fruits are above the tower
          // Flip beam based on tower position relative to path
          let pathY = null;
          if (this.scene && this.scene.spline && typeof this.scene.spline.getPoint === 'function') {
            // Find the closest point on the path to the tower's x position
            let minDist = Infinity;
            let closestY = null;
            const numSamples = 100;
            for (let i = 0; i <= numSamples; i++) {
              const t = i / numSamples;
              const pt = this.scene.spline.getPoint(t);
              if (!pt) continue;
              const dx = pt.x - this.position.x;
              if (Math.abs(dx) < minDist) {
                minDist = Math.abs(dx);
                closestY = pt.y;
              }
            }
            pathY = closestY;
          }
          if (pathY !== null) {
            if (this.position.y > pathY) {
              // Tower is below the path: flip beam vertically and raise it
              this._beamSprite.setScale(0.4, -0.4);
              this._beamSprite.setOrigin(0.5, 1);
              this._beamSprite.y = this.position.y - 88;
            } else {
              // Tower is above or on the path: normal beam
              this._beamSprite.setScale(0.4, 0.4);
              this._beamSprite.setOrigin(0.5, 0);
              this._beamSprite.y = this.position.y + 25;
            }
          }
          // Only play if anims exists and animation is defined and texture is valid
          const anims = this._beamSprite.anims;
          const sceneAnims = this._beamSprite.scene && this._beamSprite.scene.anims;
          const hasBeamLoop = sceneAnims && sceneAnims.exists && sceneAnims.exists("beam_loop");
          const textureLoaded = this._beamSprite.texture && this._beamSprite.texture.key && this._beamSprite.texture.key !== '__MISSING';
          if (anims && hasBeamLoop && textureLoaded) {
            try {
              if (!anims.isPlaying || !anims.currentAnim || anims.currentAnim.key !== "beam_loop") {
                this._beamSprite.play("beam_loop");
              }
            } catch (e) {
              // Prevent crash if animation system is not ready
              // Optionally log: console.warn('OvniTower beam play error', e);
            }
          }
        }
      } else {
        // Stop animation and stay on frame 0 when no fruits
        if (isPlayingOvni) {
          this._placedSprite.stop();
        }
        this._placedSprite.setFrame(0);
        // Hide beam
        if (this._beamSprite) {
          this._beamSprite.setVisible(false);
          this._beamSprite.stop();
        }
      }
    }

    // Call parent update (do NOT fire here, fire is handled by abduction logic)
    // super.update(deltaTime, enemies);
  }

  fire(enemies, currentTime) {
    // Only run abduction logic, do not deal damage or call takeDamage
    if (!this._lastAbductTime) this._lastAbductTime = 0;
    if (!this.abductedFruits) this.abductedFruits = [];
    // Always keep abductCooldown in sync with fireRate
    this.abductCooldown = 1 / this.fireRate;
    if (currentTime - this._lastAbductTime < this.abductCooldown) return;
    if (!enemies || !Array.isArray(enemies)) return;
    // Only abduct if less than maxAbductions are being abducted
    if (this.abductedFruits.length >= this.maxAbductions) return;
    // Find up to maxAbductions fruits within a dynamic x-range (wider with upgrades) and not already abducted
    const abductedSet = new Set(this.abductedFruits.map(obj => obj.fruit));
    let count = 0;
    // xRange is always at least the tower's range (full beam width)
    const xRange = Math.max(this.range, 20 + 20 * (this.maxAbductions - 1));
    for (const enemy of enemies) {
      // Do not abduct boss bloons
      if (enemy && (enemy.type === 'boss' || enemy.constructor?.name === 'BossBloon')) {
        continue;
      }
      if (enemy && enemy.isActive && this.isInRange(enemy) && Math.abs(enemy.position.x - this.position.x) < xRange && !abductedSet.has(enemy)) {
        enemy.isAbducted = true;
        // Store the x position at the moment of abduction
        this.abductedFruits.push({ fruit: enemy, abductedX: enemy.position.x });
        count++;
        if (count >= this.maxAbductions) break;
      }
    }
    if (count > 0) {
      this._lastAbductTime = currentTime;
    }
  }

  applyUpgrade(upgradeKey) {
    if (!this.upgrades) this.upgrades = [];
    console.log('[OvniTower] applyUpgrade called:', upgradeKey);

    // Faster abduction upgrades - increase fireRate by 0.5 (which decreases cooldown)
    if (upgradeKey === 'faster_abduction_1' || upgradeKey === 'faster_abduction_2' || upgradeKey === 'faster_abduction_3') {
      this.fireRate += 0.2;
      this.abductCooldown = 1 / this.fireRate;
      if (this._placedSprite) this._placedSprite.towerFireRate = this.fireRate;
      console.log('[OvniTower] fireRate upgraded to', this.fireRate);
    }

    // Wider beam upgrades - increase max simultaneous abductions
    if (upgradeKey === 'wider_beam_1') {
      this.maxAbductions = 2;
      console.log('[OvniTower] maxAbductions upgraded to 2');
    }
    if (upgradeKey === 'wider_beam_2') {
      this.maxAbductions = 3;
      console.log('[OvniTower] maxAbductions upgraded to 3');
    }
    if (upgradeKey === 'wider_beam_3') {
      this.maxAbductions = 4;
      console.log('[OvniTower] maxAbductions upgraded to 4');
    }

    // Alien tech upgrade - increase damage
    if (upgradeKey === 'alien_tech') {
      this.damage += 1;
      if (this._placedSprite) this._placedSprite.towerDamage = this.damage;
      console.log('[OvniTower] damage upgraded to', this.damage);
    }

    // Galactic power upgrade - increase all stats
    if (upgradeKey === 'galactic_power') {
      this.fireRate += 1.0;
      this.abductCooldown = 1 / this.fireRate;
      this.range += 50;
      this.damage += 2;
      if (this._placedSprite) {
        this._placedSprite.towerFireRate = this.fireRate;
        this._placedSprite.towerRange = this.range;
        this._placedSprite.towerDamage = this.damage;
      }
      console.log('[OvniTower] galactic_power applied:', this.fireRate, this.range, this.damage);
    }

    this.upgrades.push(upgradeKey);
  }
}
