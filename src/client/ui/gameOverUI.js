// src/client/ui/gameOverUI.js
// Handles the Game Over popup UI for Bloons game

import { hideRangeCircle } from "../logic/towerPlacement.js";
import { GAME_SCALE } from "../utils/scaleConfig.js";

/**
 * Shows the Game Over popup UI.
 * @param {Phaser.Scene} scene - The Phaser scene to display the popup in.
 * @param {object} options - Optional callbacks and state reset logic.
 *   options.onReplay: function to call when replay is clicked
 *   options.onQuit: function to call when quit is clicked
 */
export function showGameOverPopup(scene, options = {}) {
  
  // Hide any active range circles before showing game over popup
  if (typeof hideRangeCircle === 'function') {
    hideRangeCircle(scene);
  }
  
  // Stop current wave and remove all bloons
  if (scene.gameLogic) {
    scene.gameLogic.enemies = [];
    scene.gameLogic.waveSpawningComplete = true;
    scene.gameLogic.enemiesRemovedCount = 0;
    scene.gameLogic.totalBloonsScheduled = 0;
    // Destroy all towers and their sprites
    if (Array.isArray(scene.gameLogic.towers)) {
      for (const tower of scene.gameLogic.towers) {
        if (tower && tower._placedSprite && typeof tower._placedSprite.destroy === 'function') {
          tower._placedSprite.destroy();
        }
      }
      scene.gameLogic.towers = [];
    }
    // Destroy all projectile sprites
    if (Array.isArray(scene.gameLogic.projectiles)) {
      for (const proj of scene.gameLogic.projectiles) {
        if (proj && proj.sprite && typeof proj.sprite.destroy === 'function') {
          proj.sprite.destroy();
        }
      }
      scene.gameLogic.projectiles = [];
    }
  }
  // Remove all bloon graphics
  if (scene.enemyGraphics) scene.enemyGraphics.clear();
  // Hide all bloons and placed towers
  if (scene.enemyGraphics) scene.enemyGraphics.setVisible(false);
  // Destroy all projectile sprites in the scene (e.g., lasers)
  if (scene.children && scene.children.list) {
    const projectileTextureKeys = [
      'laser_anim', 'spike_projectile', 'BoulderProjectile', 'LaserProjectile', 'KnifeProjectile', 'AOEProjectile'
      // Add any other projectile texture keys here as needed
    ];
    for (const child of scene.children.list) {
      if (
        child &&
        child.type === 'Sprite' &&
        child.texture &&
        projectileTextureKeys.includes(child.texture.key) &&
        typeof child.destroy === 'function'
      ) {
        child.destroy();
      }
    }
  }
  scene.children.list.forEach(child => {
    if (child.texture && (child.texture.key === 'knife_tower' || child.texture.key === 'cannon' || child.texture.key === 'tower_1') && child.depth === 1001) {
      child.setVisible(false);
    }
  });
  // Create a transparent input zone over the popup to block all other input
  const popupX = 200 * GAME_SCALE, popupY = 200 * GAME_SCALE, popupW = 800 * GAME_SCALE, popupH = 400 * GAME_SCALE;
  const inputBlocker = scene.add.zone(popupX, popupY, popupW, popupH)
    .setOrigin(0)
    .setInteractive()
    .setDepth(4999);
  const popupBg = scene.add.graphics();
  popupBg.fillStyle(0x222222, 0.95);
  popupBg.fillRect(popupX, popupY, popupW, popupH);
  popupBg.setDepth(5000);
  const gameOverText = scene.add.text(600 * GAME_SCALE, 300 * GAME_SCALE, "Game Over", {
    font: `${Math.round(64 * GAME_SCALE)}px Arial`,
    fill: "#ff4444"
  }).setOrigin(0.5).setDepth(5001);
  const replayBtn = scene.add.text(450 * GAME_SCALE, 450 * GAME_SCALE, "Replay", {
    font: `${Math.round(40 * GAME_SCALE)}px Arial`,
    fill: "#00ff00",
    backgroundColor: "#222",
    padding: { x: Math.round(40 * GAME_SCALE), y: Math.round(20 * GAME_SCALE) }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(5002);
  const quitBtn = scene.add.text(750 * GAME_SCALE, 450 * GAME_SCALE, "Quit", {
    font: `${Math.round(40 * GAME_SCALE)}px Arial`,
    fill: "#ff4444",
    backgroundColor: "#222",
    padding: { x: Math.round(40 * GAME_SCALE), y: Math.round(20 * GAME_SCALE) }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(5002);
  // Only allow clicks on replay/quit
  replayBtn.on('pointerdown', () => {
    inputBlocker.destroy();
    popupBg.destroy();
    gameOverText.destroy();
    replayBtn.destroy();
    quitBtn.destroy();
    if (options.onReplay) {
      options.onReplay();
    }
  });
  quitBtn.on('pointerdown', () => {
    inputBlocker.destroy();
    popupBg.destroy();
    gameOverText.destroy();
    replayBtn.destroy();
    quitBtn.destroy();
    if (options.onQuit) {
      options.onQuit();
    }
  });
}
