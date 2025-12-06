export class Map {
  constructor() {
    if (new.target === Map) throw new Error("Abstract class 'Map' cannot be instantiated");
    this.paths = [];
    this.towerSpots = [];
  }

  getPositionOnPath(pathId, progress) { throw new Error("Abstract method 'getPositionOnPath' must be implemented"); }
}