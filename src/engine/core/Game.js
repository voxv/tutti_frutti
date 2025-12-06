export class Game {
  constructor() {
    if (new.target === Game) throw new Error("Abstract class 'Game' cannot be instantiated");
    this.map = null;
    this.players = [];
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.time = 0;
  }

  update(deltaTime) { throw new Error("Abstract method 'update' must be implemented"); }
  spawnWave(waveConfig) { throw new Error("Abstract method 'spawnWave' must be implemented"); }
  handleCollisions() { throw new Error("Abstract method 'handleCollisions' must be implemented"); }
}