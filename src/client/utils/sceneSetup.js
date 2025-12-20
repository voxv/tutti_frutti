// Scene setup utility for BalouneScene
import Phaser from "phaser";
import { Baloune } from "../../game/Baloune.js";
import { GAME_SCALE } from "./scaleConfig.js";

export function setupMapAndGameLogic(scene, mapConfig) {
  if (!mapConfig) {
    console.error('Map config missing in setupMapAndGameLogic');
    scene.add.text(600 * GAME_SCALE, 400 * GAME_SCALE, "Map config missing!", { font: `${Math.round(32 * GAME_SCALE)}px Arial`, fill: "#f00" }).setOrigin(0.5);
    return null;
  }
  // Convert controlPoints to Phaser.Vector2 if needed
  const controlPoints = mapConfig.controlPoints.map(pt =>
    pt instanceof Phaser.Math.Vector2 ? pt : new Phaser.Math.Vector2(pt.x, pt.y)
  );
  scene.spline = new Phaser.Curves.Spline(controlPoints);
  scene.pathPoints = controlPoints.map(pt => ({ x: pt.x, y: pt.y }));
  const testMap = {
    paths: [
      { spline: scene.spline, waypoints: controlPoints }
    ],
    towerSpots: mapConfig.towerSpots || [],
    noBuildZones: mapConfig.noBuildZones || []
  };
  // Create the logical game (engine-side)
  scene.gameLogic = new Baloune(testMap);
  return scene.gameLogic;
}

export function setupBackground(scene, mapConfig, gameWidth, gameHeight, shopWidth, infoBarHeight) {
  let hasBgImage = false;
  if (mapConfig && mapConfig.background) {
    const bgKey = `mapBg_${mapConfig.id}`;
    if (scene.textures.exists(bgKey)) {
      scene.bgImage = scene.add.image(0, 0, bgKey)
        .setOrigin(0, 0)
        .setDisplaySize(gameWidth - shopWidth, gameHeight - infoBarHeight)
        .setAlpha(1)
        .setDepth(0);
      hasBgImage = true;
    } else {
      console.warn(`Background texture ${bgKey} not preloaded. Game will proceed without background.`);
    }
  }
  // Always create the main game area
  scene.mainArea = scene.add.graphics();
  scene.mainArea.fillStyle(0x000000, hasBgImage ? 0 : 1);
  scene.mainArea.fillRect(0, 0, gameWidth - shopWidth, gameHeight - infoBarHeight);
  scene.mainArea.setDepth(1);
  scene.enemyGraphics = scene.add.graphics();
  scene.enemyGraphics.setDepth(20);
  scene.enemyGraphics.setVisible(true);
}

