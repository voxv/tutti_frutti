import { Game } from "../engine/core/Game.js";
import { BananaBloon } from "./enemies/BananaBloon.js";
import { level1Paths } from "./levels/level1.js";
//import { KnifeTower } from "./towers/KnifeTower.js";
//import { DartProjectile } from "./projectiles/DartProjectile.js";

export class Baloune extends Game {
  constructor() {
    super();
    this.map = {
      paths: level1Paths,
      towerSpots: []
    };
    this.waveNumber = 0;
  }

  spawnWave(waveConfig) {
    // waveConfig can be an array of objects: { type: "red", speed: 50, delay: 0.5 }
    let spawnTime = 0;
    
    for (const config of waveConfig) {
      // Support both string and object
      let enemyType, speed, delay;
      if (typeof config === "string") {
        enemyType = config;
        speed = undefined;
        delay = 0.5;
      } else {
        enemyType = config.type;
        speed = config.speed;
        delay = config.delay ?? 0.5;
      }
      setTimeout(() => {
        let enemy;
        const enemyConfig = { waypoints: this.map.paths[0], speed, spawnDelay: spawnTime };
        switch (enemyType) {
          case "red":
            enemy = new BananaBloon(enemyConfig);
            break;
          case "cherry":
            enemy = new CherryBloon(enemyConfig);
            break;
          // add more types later
        }
        this.enemies.push(enemy);
      }, spawnTime * 1000);
      spawnTime += delay;
    }
  }

  handleCollisions() {
    for (const projectile of this.projectiles) {
      for (const enemy of this.enemies) {
        const dist = projectile.position.distance(enemy.position);
        if (dist < 10) { // arbitrary hit radius
          projectile.onHit(enemy);
          projectile.isActive = false;
          break;
        }
      }
    }
  }
  start() {
      console.log("Baloune game started!");
      // (later: load map, waves, towers, etc.)
  }

  update(deltaTime) {
    this.time += deltaTime;

    // Update enemies
    for (const enemy of this.enemies) enemy.update(deltaTime);

    // Update towers
    for (const tower of this.towers) tower.update(deltaTime, this.enemies);

    // Update projectiles
    for (const projectile of this.projectiles) projectile.update(deltaTime);

    // Handle collisions
    this.handleCollisions();

    // Cleanup inactive entities
    this.enemies = this.enemies.filter(e => e.isActive);
    this.projectiles = this.projectiles.filter(p => p.isActive);
  }
}
