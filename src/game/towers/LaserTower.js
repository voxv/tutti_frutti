
import { AOETower } from "./AOETower.js";
// JSON files loaded globally from main.js
const towerDefaults = window.towerConfig || {};
const projectileDefaults = window.projectilesConfig || {};


export class LaserTower extends AOETower {
  // Utility to wrap setFrame (no debug)
  static debugSetFrame(sprite, frame, label) {
    if (sprite && typeof sprite.setFrame === 'function') {
      sprite.setFrame(frame);
    }
  }
    applyUpgrade(upgradeKey) {
            if (upgradeKey === 'penetration_2') {
              // Increase laser sprite size for visual feedback (smaller amount)
              if (this._laserSprite) {
                const currentWidth = this._laserSprite.displayWidth;
                const currentHeight = this._laserSprite.displayHeight;
                this._laserSprite.setDisplaySize(currentWidth + 15, currentHeight + 15);
              }
            }
      if (upgradeKey === 'bigger_range' || upgradeKey === 'even_bigger_range') {
        this.range += 17;
        if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
          this._placedSprite.towerRange = this.range;
        }
        // Increase the laser_anim projectile sprite's display size by 10 pixels in both width and height
        if (this._laserSprite) {
          const currentWidth = this._laserSprite.displayWidth;
          const currentHeight = this._laserSprite.displayHeight;
          this._laserSprite.setDisplaySize(currentWidth + 10, currentHeight + 10);
        }
        if (window.sceneRef && window.sceneRef.refreshUpgradeUIIfVisible) {
          window.sceneRef.refreshUpgradeUIIfVisible();
        }
        // Debug log removed
      } else if (upgradeKey === 'world_wide_range') {
        this.range += 100;
        if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
          this._placedSprite.towerRange = this.range;
        }
        if (window.sceneRef && window.sceneRef.refreshUpgradeUIIfVisible) {
          window.sceneRef.refreshUpgradeUIIfVisible();
        }
      } else if (upgradeKey === 'attack_speed_1') {
        this.fireRate += 15;
        // Update animation frameRate if possible
        if (this._laserSprite && this._laserSprite.anims && this._laserSprite.anims.currentAnim) {
          const anim = this._laserSprite.anims.currentAnim;
          if (anim && typeof anim.frameRate === 'number') {
            anim.frameRate += 5;
          }
        }
        if (this._placedSprite && this._placedSprite.towerFireRate !== undefined) {
          this._placedSprite.towerFireRate = this.fireRate;
        }
        // Debug log removed
      }
      // Add more laser-specific upgrades here
      if (!this.upgrades) this.upgrades = [];
      this.upgrades.push(upgradeKey);
    }
  update(deltaTime, enemies) {
    // Find all bloons in range
    const bloonsInRange = enemies.filter(e => e && e.isActive && this.isInRange(e));

    // Only update the laser beam sprite (created once in placeOnScene)
    if (this._laserSprite) {
      this._laserSprite.x = this.position.x + this.laserOffsetX;
      this._laserSprite.y = this.position.y + this.laserOffsetY;
      const now = performance.now();
      const anyInRange = bloonsInRange.length > 0;
      if (anyInRange) {
        this._lastLaserActiveTime = now;
        if (!this._laserSprite.visible) {
          this._laserSprite.setVisible(true);
        }
        // Debug logs and listeners removed
        if (!this._laserSprite.anims.isPlaying) {
          this._laserSprite.play('laser_shooter_anim', true);
        }
        // Animate placed tower sprite when bloons in range
        if (this._placedSprite && this._placedSprite.anims) {
          if (!this._placedSprite.anims.isPlaying || this._placedSprite.anims.currentAnim?.key !== 'laser_tower_idle') {
            if (typeof this._placedSprite.play === 'function') {
              this._placedSprite.play('laser_tower_idle');
            }
          }
        }

        // Play bzz sound every 2 seconds while active
        if (window.sceneRef && window.sceneRef.sound && window.sceneRef.sound.play) {
          if (now - this._lastBzzTime > 2000) {
            window.sceneRef.sound.play('bzz');
            this._lastBzzTime = now;
          }
        }
        this._laserBeamShouldBeVisible = true;
      } else {
        // Only hide if no bloons in range for at least 250ms
        if (!this._lastLaserActiveTime) this._lastLaserActiveTime = now;
        if (now - this._lastLaserActiveTime > 250) {
          // Always show idle frame when not shooting
          LaserTower.debugSetFrame(this._laserSprite, 0, 'laser_shooter_anim stopped');
          this._laserSprite.setVisible(false);
          // Always reset placed sprite to frame 0 when no bloons in range
          if (this._placedSprite && this._placedSprite.anims) {
            if (this._placedSprite.anims.isPlaying) {
              this._placedSprite.anims.stop();
            }
            this._placedSprite.setFrame(0); // Reset to first frame for idle look
            LaserTower.debugSetFrame(this._placedSprite, 0, 'placedSprite anim stopped');
            // Debug logs and listeners removed
          }
          this._laserBeamShouldBeVisible = false;
        }
      }
    }

    // Damage all bloons in range every frame, skip those with laser spawn cooldown
    for (const enemy of bloonsInRange) {
      if (enemy._laserSpawnCooldownUntil && performance.now() < enemy._laserSpawnCooldownUntil) {
        continue; // skip if in cooldown
      }
      if (!enemy._lastLaserHitTime || (performance.now() - enemy._lastLaserHitTime > 200)) {
        // Pass special value to mark as laser kill if this will destroy
        let wasAlive = enemy.isActive;
        const willDestroy = (enemy.health - this.damage <= 0);
        if (willDestroy) {
          // Propagate tower upgrades to the bloon for child cooldown logic
          if (this.upgrades) {
            enemy._laserTowerUpgrades = Array.isArray(this.upgrades) ? [...this.upgrades] : [];
          }
          const hasPen1 = this.upgrades && this.upgrades.includes('penetration');
          const hasPen2 = this.upgrades && this.upgrades.includes('penetration_2');
          enemy.takeDamage('LASER_KILL');
          // Penetration: after child is spawned, destroy it immediately
          if ((hasPen1 || hasPen2) && window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.enemies)) {
            setTimeout(() => {
              // Helper to pop a child by type and position, with polling
              function popChild(childType, excludeList = []) {
                let attempts = 0;
                const maxAttempts = 10;
                const poll = () => {
                  const children = window.sceneRef.gameLogic.enemies.filter(b => b && b.isActive && b.constructor && b.constructor.name.toLowerCase().includes(childType.toLowerCase()) && b.position && enemy.position && b.position.x === enemy.position.x && b.position.y === enemy.position.y && !excludeList.includes(b));
                  if (children.length > 0 && typeof children[0].takeDamage === 'function') {
                    children[0].takeDamage('LASER_KILL');
                  } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(poll, 30);
                  }
                };
                poll();
              }
              // Pop the first child
              if (enemy.nextTypes.length > 0) {
                popChild(enemy.nextTypes[0]);
              }
              // If penetration_2, also pop the second child robustly
              if (hasPen2 && enemy.nextTypes.length > 1) {
                // Wait a bit before polling for the second child
                setTimeout(() => {
                  popChild(enemy.nextTypes[1]);
                }, 60);
              }
            }, 60);
          }
        } else {
          enemy.takeDamage(this.damage);
        }
        // Award gold if the enemy was alive and is now dead
        if (wasAlive && !enemy.isActive && typeof enemy.reward === 'number' && window.sceneRef) {
          window.sceneRef.goldAmount += enemy.reward;
          if (window.sceneRef.goldText) {
            window.sceneRef.goldText.setText(String(window.sceneRef.goldAmount));
          }
        }
        enemy._lastLaserHitTime = performance.now();
      }
    }
      // Call parent update for any additional logic
      super.update(deltaTime, enemies);
    }

  constructor(config = {}) {
    let defaults = { range: 200, fireRate: 3.0, damage: 3, cost: 350, type: "aoe" };
    if (towerDefaults && towerDefaults.laser) {
      defaults = { ...defaults, ...towerDefaults.laser };
    }
    super({
      ...defaults,
      ...config,
      type: "aoe"
    });
    this._lastBzzTime = 0;
    this._laserBeamShouldBeVisible = true;
  }

  static placeOnScene(scene, x, y) {
    // Get range from imported towerConfig (ensures consistency with drag UI)
    let range = 100;
    if (scene && scene.towerConfig && scene.towerConfig.laser && scene.towerConfig.laser.range) {
      range = scene.towerConfig.laser.range;
    }
    // Use new laser_anim.png (4 frames, 1404x248)
    const frameWidth = 351; // 1404 / 4
    const frameHeight = 248;
    const placedSprite = scene.add.sprite(x, y, 'laser_placed', 0)
      .setDisplaySize(frameWidth * 0.19, frameHeight * 0.19)
      .setDepth(1001)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.setFrame(0);
    placedSprite.towerType = 'laser';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;

    // Configurable laser beam offset
    const laserOffsetX = 10; // Default offset, change as needed
    const laserOffsetY = -10;
    const laserSprite = scene.add.sprite(x + laserOffsetX, y + laserOffsetY, 'laser_anim');
    laserSprite.setDisplaySize(120, 120);
    laserSprite.setDepth(3001);
    laserSprite.setRotation(Math.PI);
    laserSprite.play('laser_shooter_anim', true);
    laserSprite.setVisible(false);

    // Debug event listeners removed

    // Now create the tower and assign sprites
    const tower = new LaserTower({ position: { x, y }, range });
    tower._placedSprite = placedSprite;
    tower.laserOffsetX = laserOffsetX;
    tower.laserOffsetY = laserOffsetY;
    tower._laserSprite = laserSprite;

    return tower;
  }

  fire(enemies, currentTime) {
    // No-op: handled by persistent beam in update
    return;
  }
}
