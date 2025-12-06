
// Load JSON configs via fetch instead of import
let wavesConfig, towerConfig, bloonsConfig, projectileDefaults;

async function loadConfigs() {
  try {
    const wavesResponse = await fetch('../../waves.json');
    wavesConfig = await wavesResponse.json();
    window.wavesConfig = wavesConfig;
    
    const towerResponse = await fetch('../game/towers/tower.json');
    towerConfig = await towerResponse.json();
    window.towerConfig = towerConfig;
    window.towerDefaults = towerConfig; // Also expose as towerDefaults
    
    const bloonsResponse = await fetch('../game/enemies/bloons.json');
    bloonsConfig = await bloonsResponse.json();
    window.bloonsConfig = bloonsConfig;
    
    const projectilesResponse = await fetch('../game/projectiles.json');
    projectileDefaults = await projectilesResponse.json();
    window.projectileDefaults = projectileDefaults;
    
    initGame();
  } catch (error) {
    console.error('Failed to load config files:', error);
  }
}

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
window.wavesConfig = wavesConfig;
window.towerConfig = towerConfig;

// import { TestImageScene } from "./TestImageScene.js";
function initGame() {
  var config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    backgroundColor: "#222222",
    scene: [IntroScene, MapSelectScene, BalouneScene],
  };

  new Phaser.Game(config);
}

// Start loading configs
loadConfigs();
