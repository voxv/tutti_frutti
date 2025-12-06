// Set up dummy globals BEFORE importing modules that depend on them
window.towerConfig = {};
window.bloonsConfig = {};
window.wavesConfig = {};
window.projectilesConfig = {};

// Import Phaser from global (loaded via CDN in index.html)
const Phaser = window.Phaser;

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
    console.log('=== Starting game initialization ===');
    
    const paths = {
      waves: './waves.json',
      tower: './src/game/towers/tower.json',
      bloons: './src/game/enemies/bloons.json',
      projectiles: './src/game/projectiles.json'
    };
    
    console.log('Fetching from paths:', paths);
    
    const wavesResponse = await fetch(paths.waves);
    const towerResponse = await fetch(paths.tower);
    const bloonsResponse = await fetch(paths.bloons);
    const projectilesResponse = await fetch(paths.projectiles);
    
    console.log('Config fetch responses:', {
      waves: wavesResponse.status + ' ' + wavesResponse.statusText,
      tower: towerResponse.status + ' ' + towerResponse.statusText,
      bloons: bloonsResponse.status + ' ' + bloonsResponse.statusText,
      projectiles: projectilesResponse.status + ' ' + projectilesResponse.statusText
    });
    
    if (!wavesResponse.ok || !towerResponse.ok || !bloonsResponse.ok || !projectilesResponse.ok) {
      throw new Error(`Failed to load config files: waves=${wavesResponse.statusText}, tower=${towerResponse.statusText}, bloons=${bloonsResponse.statusText}, projectiles=${projectilesResponse.statusText}`);
    }
    
    const wavesConfig = await wavesResponse.json();
    const towerConfig = await towerResponse.json();
    const bloonsConfig = await bloonsResponse.json();
    const projectilesConfig = await projectilesResponse.json();
    
    console.log('Configs loaded successfully:', {
      wavesCount: wavesConfig.waves?.length,
      towerKeys: Object.keys(towerConfig).slice(0, 5) + '...',
      bloonsCount: Object.keys(bloonsConfig).length,
      projectilesCount: Object.keys(projectilesConfig).length
    });
    
    // Store configs globally for scenes and modules to access
    window.wavesConfig = wavesConfig;
    window.towerConfig = towerConfig;
    window.bloonsConfig = bloonsConfig;
    window.projectilesConfig = projectilesConfig;
    
    console.log('Global configs set:', {
      window_wavesConfig: !!window.wavesConfig,
      window_towerConfig: !!window.towerConfig,
      window_bloonsConfig: !!window.bloonsConfig,
      window_projectilesConfig: !!window.projectilesConfig
    });
    
    console.log('Creating Phaser game...');
    
    // Now create the game AFTER configs are loaded
    var config = {
      type: Phaser.AUTO,
      width: 1600,
      height: 900,
      backgroundColor: "#222222",
      scene: [IntroScene, MapSelectScene, BalouneScene],
    };

    new Phaser.Game(config);
    console.log('=== Phaser game created successfully ===');
  } catch (error) {
    console.error('=== FAILED TO INITIALIZE GAME ===', error);
    document.body.innerHTML = '<h1>Error loading game config files. Check console for details.</h1><pre>' + error.message + '</pre>';
  }
}

// Start the initialization
initializeGame();
