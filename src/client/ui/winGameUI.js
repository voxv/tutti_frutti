// src/client/ui/winGameUI.js
// Handles the Win Game popup UI for Bloons game

import { hideRangeCircle } from "../logic/towerPlacement.js";

/**
 * Shows the Win Game popup UI.
 * @param {Phaser.Scene} scene - The Phaser scene to display the popup in.
 * @param {object} options - Optional callbacks and state reset logic.
 *   options.onReplay: function to call when replay is clicked
 *   options.onQuit: function to call when quit is clicked
 */
export function showWinGamePopup(scene, options = {}) {
  
  // Hide any active range circles before showing win popup
  if (typeof hideRangeCircle === 'function') {
    hideRangeCircle(scene);
  }

  // Play win sound
  if (scene.sound && scene.sound.play) {
    scene.sound.play('win', { loop: false, volume: 0.8 });
  }
  
  // Stop current wave and remove all bloons
  if (scene.gameLogic) {
    // Destroy boss health bars BEFORE clearing enemies array
    if (Array.isArray(scene.gameLogic.enemies)) {
      for (const enemy of scene.gameLogic.enemies) {
        if (enemy && enemy._healthBar && typeof enemy._healthBar.destroy === 'function') {
          enemy._healthBar.destroy();
          enemy._healthBar = null;
        }
      }
    }
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
  // Destroy any remaining boss health bar graphics in the scene
  if (scene.children && scene.children.list) {
    scene.children.list.forEach(child => {
      if (child && child.isBossHealthBar && typeof child.destroy === 'function') {
        child.destroy();
      }
    });
  }
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
  const inputBlocker = scene.add.zone(200, 200, 800, 400)
    .setOrigin(0)
    .setInteractive()
    .setDepth(4999);
  const popupBg = scene.add.graphics();
  popupBg.fillStyle(0x1a1a1a, 0.95);
  popupBg.fillRect(200, 200, 800, 400);
  popupBg.setDepth(5000);
  const winText = scene.add.text(600, 280, "You Win!", {
    font: "64px Arial",
    fill: "#00ff00"
  }).setOrigin(0.5).setDepth(5001);
  
  const congratsText = scene.add.text(600, 350, "All 50 waves completed!", {
    font: "24px Arial",
    fill: "#ffff00"
  }).setOrigin(0.5).setDepth(5001);
  
  const replayBtn = scene.add.text(450, 450, "Replay", {
    font: "40px Arial",
    fill: "#00ff00",
    backgroundColor: "#222",
    padding: { x: 40, y: 20 }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(5002);
  const quitBtn = scene.add.text(750, 450, "Quit", {
    font: "40px Arial",
    fill: "#ff4444",
    backgroundColor: "#222",
    padding: { x: 40, y: 20 }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(5002);
  // Only allow clicks on replay/quit
  replayBtn.on('pointerdown', () => {
    inputBlocker.destroy();
    popupBg.destroy();
    winText.destroy();
    congratsText.destroy();
    replayBtn.destroy();
    quitBtn.destroy();
    // Stop win sound
    if (scene.sound && scene.sound.get('win')) {
      scene.sound.get('win').stop();
    }
    if (options.onReplay) {
      options.onReplay();
    }
  });
  quitBtn.on('pointerdown', () => {
    inputBlocker.destroy();
    popupBg.destroy();
    winText.destroy();
    congratsText.destroy();
    replayBtn.destroy();
    quitBtn.destroy();
    // Stop win sound
    if (scene.sound && scene.sound.get('win')) {
      scene.sound.get('win').stop();
    }
    if (options.onQuit) {
      options.onQuit();
    }
  });
}
