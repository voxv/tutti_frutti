
import wavesConfig from '../../waves.json';
import towerConfig from '../game/towers/tower.json';
// Phaser is loaded from CDN in index.html, available globally
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
var config = {
  type: Phaser.AUTO,
  width: 1600,
  height: 900,
  backgroundColor: "#222222",
  scene: [IntroScene, MapSelectScene, BalouneScene],
};

new Phaser.Game(config);
