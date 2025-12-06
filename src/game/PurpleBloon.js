import { Bloon } from "./Bloon.js";

export class PurpleBloon extends Bloon {
  constructor(pathConfig) {
    super(pathConfig, { health: 5, speed: 165, reward: 50, color: 0x800080, size: 30 });
  }
}
