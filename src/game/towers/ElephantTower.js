import { ProjectileTower } from "./ProjectileTower.js";
import { TornadoProjectile } from "../projectiles/TornadoProjectile.js";

export class ElephantTower extends ProjectileTower {
  constructor(config = {}) {
    // Defaults from tower.json will be merged in game logic, but set some here for safety
    super({
      ...config,
      type: "elephant"
    });
    this.displayName = "Elephant Tower";
    this.towerType = "elephant";
    this.class = "ElephantTower";
    this.assets = {
      shopImage: "/towers/elephant_shop.png",
      shopImageScale: 0.5,
      placedImage: "/towers/elephant_anim.png",
      animation: {
        key: "elephant_tower_anim",
        frameWidth: 350,
        frameHeight: 350,
        frames: { start: 0, end: 2 },
        frameRate: 8,
        repeat: -1
      },
      projectile: "/towers/projectiles/tornado_anim.png"
    };
    this.projectileTexture = 'tornado_anim';
    this.homing = true;
  }

  applyUpgrade(upgradeKey) {
    // Track only the highest storm_wind upgrade
    if (!this.stormWindLevel) this.stormWindLevel = 0;
    if (upgradeKey === 'storm_wind1') {
      this.stormWindLevel = Math.max(this.stormWindLevel, 1);
    } else if (upgradeKey === 'storm_wind2') {
      this.stormWindLevel = Math.max(this.stormWindLevel, 2);
    } else if (upgradeKey === 'storm_wind3') {
      this.stormWindLevel = Math.max(this.stormWindLevel, 3);
    }
    // Example upgrades, adjust as needed
    if (upgradeKey === 'bigger_range' || upgradeKey === 'even_bigger_range' || upgradeKey === 'world_wide_range') {
      this.range += (upgradeKey === 'world_wide_range') ? 200 : 52;
      if (this._placedSprite && this._placedSprite.towerRange !== undefined) {
        this._placedSprite.towerRange = this.range;
      }
    } else if (upgradeKey === 'heavy_boulder') {
      this.damage += 2;
    } else if (upgradeKey === 'double_boulder') {
      this.projectilesPerShot = 2;
    } else if (upgradeKey === 'rapid_stomp') {
      this.fireRate += 1.0;
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
        this._placedSprite.setFrame(1);
      }
    }
    this.fire(enemies, currentTime);
  }

  fire(enemies, currentTime) {
    
    this.acquireTarget(enemies);
    if (this.target && currentTime - this.lastShotTime >= 1 / this.fireRate) {
      
      this.lastShotTime = currentTime;
      // Play tower animation if it exists
      if (this._placedSprite && this._placedSprite.anims) {
        this._placedSprite.anims.play('elephant_tower_anim', true);
      }
      // Fire projectile(s)
      const shots = this.projectilesPerShot || 1;
      for (let i = 0; i < shots; i++) {
        this.spawnProjectile(this.target);
      }
    } else {
      if (!this.target) {
        
      } else {
        
      }
    }
  }

  isInRange(enemy) {
    const dx = enemy.position.x - this.position.x;
    const dy = enemy.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inRange = dist <= this.range;
    
    return inRange;
  }

  acquireTarget(enemies) {
    
    if (enemies && enemies.length) {
      enemies.forEach((e, idx) => {
        if (e && e.position) {
          const dx = e.position.x - this.position.x;
          const dy = e.position.y - this.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
        }
      });
    }
    return super.acquireTarget(enemies);
  }

  spawnProjectile(target) {
    if (!window.sceneRef) {
      
      return;
    }
    const projConfig = {
      speed: 400,
      sprite: 'tornado_anim',
      frameWidth: 135,
      frameHeight: 134
    };
    // Use stormWindLevel for maxHits
    let maxHits = 1;
    if (this.stormWindLevel === 3) {
      maxHits = 5;
    } else if (this.stormWindLevel === 2) {
      maxHits = 4;
    } else if (this.stormWindLevel === 1) {
      maxHits = 3;
    }
    // Start from tower center
    const startPos = { x: this.position.x, y: this.position.y };
    if (!target || !target.position) {
      
      return;
    }
    const dx = target.position.x - startPos.x;
    const dy = target.position.y - startPos.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const dir = mag > 0 ? { x: dx / mag, y: dy / mag } : { x: 1, y: 0 };
    const projectile = new TornadoProjectile({
      position: { ...startPos },
      direction: dir,
      speed: projConfig.speed,
      damage: this.damage,
      texture: this.projectileTexture,
      target: target,
      homing: this.homing,
      hitRadius: 130,  // Tornado hits multiple fruits in a very wide radius
      maxHits: maxHits
    });
    // Create sprite with animation
    const sprite = window.sceneRef.add.sprite(startPos.x, startPos.y, projConfig.sprite);
    sprite.setDisplaySize(135*0.5, 134*0.5);
    sprite.setDepth(3000);
    sprite.setVisible(true);
    projectile.sprite = sprite;
    // Play tornado animation (loop)
    if (window.sceneRef.anims && !window.sceneRef.anims.exists('tornado_anim')) {
      window.sceneRef.anims.create({
        key: 'tornado_anim',
        frames: window.sceneRef.anims.generateFrameNumbers('tornado_anim', { start: 0, end: 1 }),
        frameRate: 10,
        repeat: -1
      });
    }
    if (window.sceneRef.anims.exists('tornado_anim')) {
      sprite.play('tornado_anim');
    }
    // Push to global gameLogic projectiles for update/render
    if (window.sceneRef.gameLogic && Array.isArray(window.sceneRef.gameLogic.projectiles)) {
      window.sceneRef.gameLogic.projectiles.push(projectile);
    }
  }

  static placeOnScene(scene, x, y) {
    // Get config from tower.json
    const towerConfig = scene && scene.cache && scene.cache.json && scene.cache.json.get ? scene.cache.json.get('tower') : null;
    let range = 140;
    let fireRate = 1.2;
    let damage = 2;
    if (towerConfig && towerConfig.elephant) {
      range = towerConfig.elephant.range || range;
      fireRate = towerConfig.elephant.fireRate || fireRate;
      damage = towerConfig.elephant.damage || damage;
    }
    const tower = new ElephantTower({ position: { x, y }, range, fireRate, damage });
    // Adjust display size as needed for your sprite
    const cellWidth = 220 / 2;
    const cellHeight = 100;
    const placedSprite = scene.add.sprite(x, y, 'elephant_placed')
      .setDisplaySize(cellWidth * 0.75, cellHeight * 0.75)
      .setDepth(8500)
      .setAlpha(1)
      .setInteractive({ useHandCursor: true });
    placedSprite.towerType = 'elephant';
    placedSprite.towerX = x;
    placedSprite.towerY = y;
    placedSprite.towerRange = range;
    // Set idle frame to 1
    placedSprite.setFrame(1);
    tower._placedSprite = placedSprite;
    return tower;
  }
}
