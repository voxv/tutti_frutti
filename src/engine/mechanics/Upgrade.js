export class Upgrade {
  constructor() {
    if (new.target === Upgrade) throw new Error("Abstract class 'Upgrade' cannot be instantiated");
    this.cost = 0;
    this.name = "";
  }

  applyTo(tower) { throw new Error("Abstract method 'applyTo' must be implemented"); }
}