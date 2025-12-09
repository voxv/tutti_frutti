import wavesConfig from '../../waves.json';
import towerConfig from '../game/towers/tower.json';
import Phaser from "phaser";
import { Baloune } from "../game/Baloune.js";
// Import the BananaBloon and CherryBloon classes so spawnWave("banana") and spawnWave("cherry") work
import { BananaBloon } from "../game/enemies/BananaBloon.js";
import { CherryBloon } from "../game/enemies/CherryBloon.js";
import { KiwiBloon } from "../game/enemies/KiwiBloon.js";
import { AppleBloon } from "../game/enemies/AppleBloon.js";
import { OrangeBloon } from "../game/enemies/OrangeBloon.js";
import { MelonBloon } from "../game/enemies/MelonBloon.js";
import { CoconutBloon } from "../game/enemies/CoconutBloon.js";
import IntroScene from "./scenes/IntroScene.js";
import MapSelectScene from "./scenes/MapSelectScene.js";
import BalouneScene from "./scenes/BalouneScene.js";
// Expose bloon classes globally for dynamic spawning
window.CherryBloon = CherryBloon;
window.BananaBloon = BananaBloon;
window.KiwiBloon = KiwiBloon;
window.AppleBloon = AppleBloon;
window.OrangeBloon = OrangeBloon;
window.MelonBloon = MelonBloon;
window.CoconutBloon = CoconutBloon;


// import { TestImageScene } from "./TestImageScene.js";
function getGameSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

var config = {
  type: Phaser.AUTO,
  ...getGameSize(),
  backgroundColor: "#222222",
  scene: [IntroScene, MapSelectScene, BalouneScene],
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  const size = getGameSize();
  game.scale.resize(size.width, size.height);
  if (game.canvas) {
    game.canvas.style.width = '100vw';
    game.canvas.style.height = '100vh';
  }
});

if (game.canvas) {
  game.canvas.style.width = '100vw';
  game.canvas.style.height = '100vh';
}
