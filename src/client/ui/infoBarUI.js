// src/client/ui/infoBarUI.js
// Handles drawing and updating the info bar, life bar, heart image, and gold display

/**
 * Draws the info bar, life bar, heart image, and gold display on the scene.
 * @param {Phaser.Scene} scene
 * @param {number} gameWidth
 * @param {number} gameHeight
 * @param {number} shopWidth
 * @param {number} infoBarHeight
 */
export function drawInfoBarUI(scene, gameWidth, gameHeight, shopWidth, infoBarHeight) {
  // Info bar (horizontal panel at bottom) - use image background
  if (scene.infoBar && scene.infoBar.destroy) scene.infoBar.destroy();
  scene.infoBar = scene.add.image(gameWidth / 2, gameHeight - infoBarHeight / 2, 'bottom_window')
    .setDisplaySize(gameWidth, infoBarHeight)
    .setOrigin(0.5, 0.5)
    .setDepth(10);

  // Life bar UI (top right, inside main game area)
  if (typeof scene.playerLives !== 'number') scene.playerLives = 100;
  if (typeof scene.maxPlayerLives !== 'number') scene.maxPlayerLives = 100;
  const heartX = gameWidth - shopWidth - 180 * (window.GAME_SCALE || 1);
  const heartY = 40 * (window.GAME_SCALE || 1);
  scene.heartImage = scene.add.image(heartX, heartY, 'heart').setDisplaySize(40 * (window.GAME_SCALE || 1), 40 * (window.GAME_SCALE || 1)).setOrigin(0.5);
  scene.heartImage.setDepth(1002);
  scene.lifeBarBg = scene.add.graphics();
  scene.lifeBarBg.setDepth(1001);
  scene.lifeBarBg.fillStyle(0x222222, 1);
  scene.lifeBarBg.fillRect(
    heartX + 30 * (window.GAME_SCALE || 1),
    heartY - 15 * (window.GAME_SCALE || 1),
    120 * (window.GAME_SCALE || 1),
    30 * (window.GAME_SCALE || 1)
  );
  scene.lifeBar = scene.add.graphics();
  scene.lifeBar.setDepth(1002);
  scene.lifeText = scene.add.text(heartX + 90 * (window.GAME_SCALE || 1), heartY, `${scene.playerLives} / ${scene.maxPlayerLives}`, {
    font: `${Math.round(20 * (window.GAME_SCALE || 1))}px Arial`,
    fill: "#fff"
  }).setOrigin(0.5);
  scene.lifeText.setDepth(1003);

  // Nugget image and gold amount (under life bar, aligned left with spacing)
  const nuggetY = heartY + 40 * (window.GAME_SCALE || 1);
  const nuggetX = heartX;
  const goldTextX = nuggetX + 32 * (window.GAME_SCALE || 1);
  scene.nuggetImage = scene.add.image(nuggetX, nuggetY, 'nugget').setDisplaySize(32 * (window.GAME_SCALE || 1), 32 * (window.GAME_SCALE || 1)).setOrigin(0.5);
  scene.nuggetImage.setDepth(1002);
  scene.goldText = scene.add.text(goldTextX, nuggetY, String(scene.goldAmount), {
    font: `${Math.round(20 * (window.GAME_SCALE || 1))}px Arial`,
    fill: "#ffd700"
  }).setOrigin(0, 0.5);
  scene.goldText.setDepth(1003);
}

/**
 * Updates the life bar and triggers game over if needed.
 * @param {Phaser.Scene} scene
 */
export function updateLifeBar(scene) {
  if (!scene.lifeBar || !scene.lifeText) return;
  scene.lifeBar.clear();
  const barWidth = 120 * (window.GAME_SCALE || 1) * (scene.playerLives / scene.maxPlayerLives);
  scene.lifeBar.fillStyle(0xff4444, 1);
  scene.lifeBar.fillRect(
    scene.heartImage.x + 30 * (window.GAME_SCALE || 1),
    scene.heartImage.y - 15 * (window.GAME_SCALE || 1),
    barWidth,
    30 * (window.GAME_SCALE || 1)
  );
  scene.lifeText.setText(`${scene.playerLives} / ${scene.maxPlayerLives}`);
  if (scene.playerLives <= 0 && !scene._gameOverShown) {
    scene._showGameOverPopup();
    scene._gameOverShown = true;
  }
}
