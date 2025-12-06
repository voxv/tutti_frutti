// Import Phaser from global if loaded via CDN, otherwise from module
const Phaser = window.Phaser || (await import("phaser")).default;
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

// Load config files via fetch (compatible with static deployment)
async function initializeGame() {
  try {
    const wavesResponse = await fetch('./waves.json');
    const towerResponse = await fetch('./src/game/towers/tower.json');
    const bloonsResponse = await fetch('./src/game/enemies/bloons.json');
    const projectilesResponse = await fetch('./src/game/projectiles.json');
    
    if (!wavesResponse.ok || !towerResponse.ok || !bloonsResponse.ok || !projectilesResponse.ok) {
      throw new Error(`Failed to load config files: waves=${wavesResponse.statusText}, tower=${towerResponse.statusText}, bloons=${bloonsResponse.statusText}, projectiles=${projectilesResponse.statusText}`);
    }
    
    const wavesConfig = await wavesResponse.json();
    const towerConfig = await towerResponse.json();
    const bloonsConfig = await bloonsResponse.json();
    const projectilesConfig = await projectilesResponse.json();
    
    // Store configs globally for scenes and modules to access
    window.wavesConfig = wavesConfig;
    window.towerConfig = towerConfig;
    window.bloonsConfig = bloonsConfig;
    window.projectilesConfig = projectilesConfig;
    
    // Now create the game
    var config = {
      type: Phaser.AUTO,
      width: 1600,
      height: 900,
      backgroundColor: "#222222",
      scene: [IntroScene, MapSelectScene, BalouneScene],
    };

    new Phaser.Game(config);
  } catch (error) {
    console.error('Failed to initialize game:', error);
    document.body.innerHTML = '<h1>Error loading game config files. Check console for details.</h1>';
  }
}

initializeGame();
