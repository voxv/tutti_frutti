import { Bloon } from "./Bloon.js";

export class YellowBloon extends Bloon {
  constructor(pathConfig) {
    super(pathConfig, { health: 4, speed: 120, reward: 70, color: 0xffff00, size: 30 });
  }
}
