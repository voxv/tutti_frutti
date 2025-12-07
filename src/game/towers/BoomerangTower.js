import { BoomerangProjectile } from "../projectiles/BoomerangProjectile.js";
import { ProjectileTower } from "./ProjectileTower.js";

class BoomerangTower extends ProjectileTower {
  applyUpgrade(upgradeKey) {
            // Quadruple boomerang upgrade
            if (upgradeKey === 'quadruple_boomerang') {
              this.hasQuadrupleBoomerang = true;
              this.quadrupleBoomerangArc = { arcRadius: 110, verticalScale: 0.9 }; // less wide horizontally, wider vertically
            }
        // Triple boomerang upgrade
        if (upgradeKey === 'triple_boomerang') {
          this.hasTripleBoomerang = true;
          this.tripleBoomerangArc = { arcRadius: 160, verticalScale: 0.5 }; // slightly wider horizontally
        }
    // Range upgrades
    if (upgradeKey === 'bigger_range') {
      this.range += 40;
    } else if (upgradeKey === 'even_bigger_range') {
      this.range += 60;
    } else if (upgradeKey === 'world_wide_range') {
      this.range += 120;
    }
    // Attack speed upgrades
    if (upgradeKey === 'attack_speed_1') {
      this.fireRate += 0.5;
    } else if (upgradeKey === 'attack_speed_2') {
      this.fireRate += 0.5;
    } else if (upgradeKey === 'attack_speed_3') {
      this.fireRate += 0.9;
    }
    // Call parent for other upgrades
    if (super.applyUpgrade) super.applyUpgrade(upgradeKey);
    // Update range circle if present
    if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
      this._placedSprite.towerRange = this.range;
    }
      // Double boomerang upgrade
      if (upgradeKey === 'double_boomerang') {
        this.hasDoubleBoomerang = true;
        this.doubleBoomerangArc = { arcRadius: 140, verticalScale: 0.7 }; // less wide arc
      }
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
          this._placedSprite.setFrame(1); // idle frame
        }
      }
      this.fire(enemies, currentTime);
    }
  fire(enemies, currentTime) {
    // Use parent targeting logic (respects targetingPriority)
    this.acquireTarget(enemies);
    const arcDuration = this.boomerangArcDuration || 1.2;
    let predictedX = null;
    if (this.target && this.target.position) {
      predictedX = this.target.position.x;
      if (this.target.velocity && typeof this.target.velocity.x === 'number') {
        predictedX += this.target.velocity.x * arcDuration;
      }
    }
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      this.lastShotTime = currentTime;
      // Flip kangaroo to face predicted direction
      if (this._placedSprite && predictedX !== null) {
        if (predictedX > this.position.x) {
          this._placedSprite.setFlipX(true); // face right
        } else {
          this._placedSprite.setFlipX(false); // face left
        }
      }
      // Play attack animation
      if (this._placedSprite && this._placedSprite.playAttack) {
        this._placedSprite.playAttack();
      }
      // Firing config
      const projConfig = { speed: 400, hitRadius: 36, sprite: 'boomerang_projectile' };
      // Start position: from kangaroo's center
      const startOffset = { x: this.position.x, y: this.position.y };
      if (!this.target || !this.target.position) return;
      const dx = this.target.position.x - startOffset.x;
      const dy = this.target.position.y - startOffset.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const dir = { x: dx / mag, y: dy / mag };
      // Determine maxHits: 3 if triple_boomerang, 2 if double_boomerang, else 1
      let maxHits = 1;
      if (this.upgrades && this.upgrades.includes('triple_boomerang')) {
        maxHits = 3;
      } else if (this.upgrades && this.upgrades.includes('double_boomerang')) {
        maxHits = 2;
      }
      // Determine if arc should be flipped (predicted target right of tower)
      const flipArc = this.target && predictedX > this.position.x;
      const projectile = new BoomerangProjectile({
        position: { ...startOffset },
        towerPosition: { ...this.position },
        speed: projConfig.speed,
        texture: 'boomerang_projectile',
        sourceTower: this,
        arcDuration: arcDuration,
        flipArc
      });
      const sprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
      sprite.setDisplaySize(24, 24);
      sprite.setScale(0.4);
      sprite.setDepth(3001);
      projectile.sprite = sprite;
      this.projectiles.push(projectile);
      if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
        window.sceneRef.gameLogic.projectiles.push(projectile);
      }

        // Double boomerang: spawn second boomerang after 0.5s with wider arc
        if (this.hasDoubleBoomerang) {
          setTimeout(() => {
            const doubleProjectile = new BoomerangProjectile({
              position: { ...startOffset },
              towerPosition: { ...this.position },
              speed: projConfig.speed,
              texture: 'boomerang_projectile',
              sourceTower: this,
              arcDuration: arcDuration,
              flipArc,
              arcRadius: this.doubleBoomerangArc.arcRadius,
              verticalScale: this.doubleBoomerangArc.verticalScale
            });
            const doubleSprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
            doubleSprite.setDisplaySize(24, 24);
            doubleSprite.setScale(0.4);
            doubleSprite.setDepth(3001);
            doubleProjectile.sprite = doubleSprite;
            this.projectiles.push(doubleProjectile);
            if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
              window.sceneRef.gameLogic.projectiles.push(doubleProjectile);
            }
          }, 500);
        }

        // Triple boomerang: spawn third boomerang after 1.0s with slightly wider horizontal arc
        if (this.hasTripleBoomerang) {
          setTimeout(() => {
            const tripleProjectile = new BoomerangProjectile({
              position: { ...startOffset },
              towerPosition: { ...this.position },
              speed: projConfig.speed,
              texture: 'boomerang_projectile',
              sourceTower: this,
              arcDuration: arcDuration,
              flipArc,
              arcRadius: this.tripleBoomerangArc.arcRadius,
              verticalScale: this.tripleBoomerangArc.verticalScale,
              destroyOnReturn: true // ensure destruction
            });
            const tripleSprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
            tripleSprite.setDisplaySize(24, 24);
            tripleSprite.setScale(0.4);
            tripleSprite.setDepth(3001);
            tripleProjectile.sprite = tripleSprite;
            this.projectiles.push(tripleProjectile);
            if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
              window.sceneRef.gameLogic.projectiles.push(tripleProjectile);
            }
          }, 800);
        }

        // Quadruple boomerang: spawn fourth boomerang after 1.2s with less wide horizontal, wider vertical arc
        if (this.hasQuadrupleBoomerang) {
          setTimeout(() => {
            const quadrupleProjectile = new BoomerangProjectile({
              position: { ...startOffset },
              towerPosition: { ...this.position },
              speed: projConfig.speed,
              texture: 'boomerang_projectile',
              sourceTower: this,
              arcDuration: arcDuration,
              flipArc,
              arcRadius: this.quadrupleBoomerangArc.arcRadius,
              verticalScale: this.quadrupleBoomerangArc.verticalScale,
              destroyOnReturn: true
            });
            const quadrupleSprite = window.sceneRef.add.sprite(startOffset.x, startOffset.y, projConfig.sprite);
            quadrupleSprite.setDisplaySize(24, 24);
            quadrupleSprite.setScale(0.4);
            quadrupleSprite.setDepth(3001);
            quadrupleProjectile.sprite = quadrupleSprite;
            this.projectiles.push(quadrupleProjectile);
            if (window.sceneRef && window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
              window.sceneRef.gameLogic.projectiles.push(quadrupleProjectile);
            }
          }, 1200);
        }
    }
  }
  constructor({ position, range = 220, fireRate = 1.1, damage = 40, cost = 650, type = 'projectile', boomerangArcDuration = 1.2, ...rest }) {
    super({
      position,
      range,
      fireRate,
      damage,
      cost,
      type,
      placedImageKey: 'kangaroo_anim',
      shopImageKey: 'kangaroo_shop',
      projectileKey: 'boomerang_projectile',
      projectileClass: 'BoulderProjectile',
      towerType: 'boomerang',
      class: 'BoomerangTower',
      ...rest
    });
    this.boomerangArcDuration = boomerangArcDuration;
  }

  static placeOnScene(scene, x, y) {
    // Get range and fireRate from scene.towerConfig (live config)
    const towerConfig = scene && scene.towerConfig ? scene.towerConfig : null;
    let range = 220;
    let fireRate = 1.1;
    let boomerangArcDuration = 1.2;
    if (towerConfig && towerConfig.boomerang) {
      if (towerConfig.boomerang.range) {
        range = towerConfig.boomerang.range;
      }
      if (towerConfig.boomerang.fireRate) {
        fireRate = towerConfig.boomerang.fireRate;
      }
      if (towerConfig.boomerang.boomerangArcDuration) {
        boomerangArcDuration = towerConfig.boomerang.boomerangArcDuration;
      }
    }
    const tower = new BoomerangTower({ position: { x, y }, range, fireRate, boomerangArcDuration });
    // Use larger display size for placed kangaroo
    const displayWidth = 516 * 0.14; // 20% of frame width
    const displayHeight = 800 * 0.14; // 20% of frame height
    // Ensure animation is created only once
    if (!scene.anims.exists('boomerang_attack')) {
      scene.anims.create({
        key: 'boomerang_attack',
        frames: scene.anims.generateFrameNumbers('kangaroo_anim', { start: 0, end: 2 }),
        frameRate: 8,
        repeat: 0 // play once
      });
    }
    const placedSprite = scene.add.sprite(x, y, 'kangaroo_anim', 1)
      .setDisplaySize(displayWidth, displayHeight)
      .setDepth(8500)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'boomerang';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    tower._placedSprite = placedSprite;
    // Idle: show frame 1
    placedSprite.setFrame(1);
    // Animation control
    tower._isAttacking = false;
    tower._placedSprite.playIdle = function() {
      this.anims.stop();
      this.setFrame(1);
    };
    tower._placedSprite.playAttack = function() {
      this.anims.play('boomerang_attack');
      this.once('animationcomplete', () => {
        this.setFrame(1);
      });
    };
    return tower;
  }

  // Call this when attacking
  playAttackAnim() {
    if (this._placedSprite && this._placedSprite.playAttack) {
      this._placedSprite.playAttack();
    }
  }

  // Call this when idle
  playIdleAnim() {
    if (this._placedSprite && this._placedSprite.playIdle) {
      this._placedSprite.playIdle();
    }
  }
}

export { BoomerangTower };
