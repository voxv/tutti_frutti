export class Player {
  constructor() {
    if (new.target === Player) throw new Error("Abstract class 'Player' cannot be instantiated");
    this.money = 0;
    this.lives = 100;
  }

  canAfford(cost) { throw new Error("Abstract method 'canAfford' must be implemented"); }
  spend(cost) { throw new Error("Abstract method 'spend' must be implemented"); }
  earn(amount) { throw new Error("Abstract method 'earn' must be implemented"); }
}