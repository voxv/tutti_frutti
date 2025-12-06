import { Game } from "../engine/core/Game.js";
import { BananaBloon } from "./enemies/BananaBloon.js";
import { CherryBloon } from "./enemies/CherryBloon.js";
import { AppleBloon } from "./enemies/AppleBloon.js";
import { OrangeBloon } from "./enemies/OrangeBloon.js";
import { MelonBloon } from "./enemies/MelonBloon.js";
import { KiwiBloon } from "./enemies/KiwiBloon.js";
import { BlackBloon } from "./enemies/BlackBloon.js";
import { level1Paths } from "./levels/level1.js";
// Use global bloonsConfig loaded in main.js instead of importing JSON
import { createBloonInstance } from "../client/factories/bloonFactory.js";
//import { KnifeTower } from "./towers/KnifeTower.js";
//import { DartProjectile } from "./projectiles/DartProjectile.js";

export class Baloune extends Game {
  constructor(map) {
    super();
    if (map) {
      this.map = map;
      // Ensure noBuildZones is present (for new maps)
      if (!this.map.noBuildZones) this.map.noBuildZones = [];
    } else {
      this.map = {
        paths: level1Paths,
        towerSpots: [],
        noBuildZones: []
      };
    }
    this.waveNumber = 0;
    this.waveSpawningComplete = false;
    this.totalBloonsScheduled = 0;
    this.currentWaveEnemies = [];
    this.enemiesRemovedCount = 0;
    this._removedEnemiesSet = new Set();
    this._waveTimeouts = []; // Track timeouts so they can be cleared on replay
  }

  spawnWave(waveConfig) {
    // Clear any pending wave timeouts from a previous wave
    if (this._waveTimeouts && Array.isArray(this._waveTimeouts)) {
      this._waveTimeouts.forEach(tid => clearTimeout(tid));
      this._waveTimeouts = [];
    }
    
    // waveConfig: [{ type, delay }, ...]
    let spawnTime = 0;
    this.waveSpawningComplete = false;
    this.totalBloonsScheduled = waveConfig.length;
    this.currentWaveEnemies = [];
    this.enemiesRemovedCount = 0;
    this._removedEnemiesSet = new Set();
    for (const config of waveConfig) {
      // Handle pause entry
      if (config.pause) {
        spawnTime += config.delay || 0;
        continue;
      }
      // Handle parallel spawns
      if (config.parallel && Array.isArray(config.entries)) {
        // For each type in the group, schedule its spawns with its own delay, all starting at the same base time
        let maxDuration = 0;
        // Group entries by type and delay
        const typeMap = {};
        for (const entry of config.entries) {
          const key = entry.type + '|' + (entry.delay || 0.5);
          if (!typeMap[key]) typeMap[key] = { type: entry.type, delay: entry.delay || 0.5, count: 0 };
          typeMap[key].count++;
        }
        for (const key in typeMap) {
          const { type, delay, count } = typeMap[key];
          for (let i = 0; i < count; i++) {
            const tid = setTimeout(async () => {
              const pathObj = this.map.paths[0];
              try {
                const enemy = await createBloonInstance(pathObj, type, window.bloonsConfig);
                if (enemy) {
                  this.enemies.push(enemy);
                  this.currentWaveEnemies.push(enemy);
                }
              } catch (err) {
                console.error(`Failed to spawn bloon type: ${type}`, err);
              }
            }, (spawnTime + i * delay) * 1000);
            this._waveTimeouts.push(tid);
          }
          const duration = (count - 1) * delay;
          if (duration > maxDuration) maxDuration = duration;
        }
        spawnTime += maxDuration + (Object.keys(typeMap).length > 0 ? Math.min(...Object.values(typeMap).map(e => e.delay)) : 0);
        continue;
      }
      // Single spawn (not parallel)
      let enemyType, speed, delay;
      if (typeof config === "string") {
        enemyType = config;
        speed = 50;
        delay = 0.5;
      } else {
        enemyType = config.type;
        speed = config.speed !== undefined ? config.speed : 50;
        delay = config.delay !== undefined ? config.delay : 0.5;
      }
      const tid = setTimeout(async () => {
        // Pass the full path object (with spline)
        const pathObj = this.map.paths[0];
        try {
          const enemy = await createBloonInstance(pathObj, enemyType, window.bloonsConfig);
          if (enemy) {
            this.enemies.push(enemy);
            this.currentWaveEnemies.push(enemy);
          }
        } catch (err) {
          console.error(`Failed to spawn bloon type: ${enemyType}`, err);
        }
      }, spawnTime * 1000);
      this._waveTimeouts.push(tid);
      spawnTime += delay;
    }
    // After all enemies have been scheduled, set waveSpawningComplete after the last spawn
    const completionTid = setTimeout(() => {
      this.waveSpawningComplete = true;
    }, spawnTime * 1000);
    this._waveTimeouts.push(completionTid);
  }

  handleCollisions() {
    for (const projectile of this.projectiles) {
      if (!projectile.isActive) continue;
      for (const enemy of this.enemies) {
        if (!enemy) continue;
        if (!enemy.isActive) continue; // Only hit active bloons
        // Use projectile's hitRadius if available, otherwise default to 10
        const hitRadius = projectile.hitRadius || 36;
        const dx = projectile.position.x - enemy.position.x;
        const dy = projectile.position.y - enemy.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hitRadius) {
          if (typeof projectile.onHit === 'function') projectile.onHit(enemy);
          // Only stop checking further collisions if projectile is now inactive (e.g., after maxHits)
          if (!projectile.isActive) break;
        }
      }
    }
  }
  start() {
      // Debug log removed
      // (later: load map, waves, towers, etc.)
  }

  update(deltaTime) {
      if (!Array.isArray(this.currentWaveEnemies)) this.currentWaveEnemies = [];
    this.time += deltaTime;

    // Update enemies
    for (const enemy of this.enemies) if (enemy) enemy.update(deltaTime);

    // Update towers
    for (const tower of this.towers) if (tower) tower.update(deltaTime, this.enemies);

    // Update projectiles
    for (const projectile of this.projectiles) if (projectile) projectile.update(deltaTime);

    // Handle collisions
    this.handleCollisions();

    // Cleanup inactive entities
    let removedThisFrame = 0;
    // Check for damage from inactive/offscreen enemies that are about to be removed
    // We do this BEFORE removal so we can deduct health at the moment of actual removal
    for (const enemy of this.enemies) {
      if (!enemy || this._removedEnemiesSet.has(enemy)) continue;
      
      const isInactive = !enemy.isActive;
      const isAtEndOfPath = enemy.isAtEnd && enemy.isAtEnd();
      // Game area: 1600px wide (minus 220px shop), 900px tall (minus 100px info bar)
      const isOffscreen = enemy.position.x < 0 || enemy.position.x > 1380 || enemy.position.y < 0 || enemy.position.y > 800;
      const willBeRemoved = isInactive || isOffscreen;
      
      // Apply damage ONLY to enemies that will actually be removed this frame
      if (willBeRemoved && !this._removedEnemiesSet.has(enemy)) {
        if (isAtEndOfPath || isOffscreen) {
          if (typeof window.sceneRef === 'object' && window.sceneRef) {
            // Boss bloons escape = instant game over
            if (enemy.constructor.name === 'BossBloon') {
              window.sceneRef.playerLives = 0;
            } else {
              const loss = Math.max(1, enemy.damage !== undefined ? enemy.damage : 1);
              window.sceneRef.playerLives -= loss;
              if (window.sceneRef.playerLives < 0) window.sceneRef.playerLives = 0;
            }
            window.sceneRef._updateLifeBar();
          }
        }
        this._removedEnemiesSet.add(enemy);
        removedThisFrame++;
      }
    }
    
    // Now remove the actual bloons from arrays (after damage is applied)
    // Remove bloons that are inactive, have no animation, and no sprite
    const shouldKeep = e => e && (e.isActive || (e.animPlaying === true || e._sprite));
    this.enemies = this.enemies.filter(shouldKeep);
    this.currentWaveEnemies = this.currentWaveEnemies.filter(shouldKeep);
    this.enemiesRemovedCount += removedThisFrame;
    
    // Cleanup projectiles
    if (this.enemies.length === 0 && this.currentWaveEnemies.length === 0) {
      // All bloons gone, destroy projectiles
      for (const p of this.projectiles) {
        if (p.sprite) {
          p.sprite.destroy();
          p.sprite = null;
        }
      }
      this.projectiles = [];
    } else {
      this.projectiles = this.projectiles.filter(p => p.isActive);
    }
  }
}
