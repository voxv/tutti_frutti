export class Path {
  constructor() {
    if (new.target === Path) throw new Error("Abstract class 'Path' cannot be instantiated");
    this.waypoints = [];
  }

  getNextWaypoint(currentIndex) { throw new Error("Abstract method 'getNextWaypoint' must be implemented"); }
}