export class Effect {
  constructor() {
    if (new.target === Effect) throw new Error("Abstract class 'Effect' cannot be instantiated");
    this.duration = 0;
    this.elapsed = 0;
  }

  apply(target) { throw new Error("Abstract method 'apply' must be implemented"); }
  update(deltaTime) { throw new Error("Abstract method 'update' must be implemented"); }
  remove(target) { throw new Error("Abstract method 'remove' must be implemented"); }
}