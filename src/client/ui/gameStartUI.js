// src/client/ui/gameStartUI.js
// Handles the Game Start popup UI for Bloons game

/**
 * Shows the Game Start popup UI with "Survive 50 Waves!" message.
 * Auto-closes after 4 seconds.
 * @param {Phaser.Scene} scene - The Phaser scene to display the popup in.
 */
export function showGameStartPopup(scene) {
  // Smaller popup box
  const boxX = 350, boxY = 300, boxW = 500, boxH = 150;
  // Create a fullscreen transparent input zone to block all input
  const inputBlocker = scene.add.zone(0, 0, scene.sys.game.config.width, scene.sys.game.config.height)
    .setOrigin(0)
    .setInteractive()
    .setDepth(4999);

  const popupBg = scene.add.graphics();
  popupBg.fillStyle(0x222222, 0.95);
  popupBg.fillRect(boxX, boxY, boxW, boxH);
  popupBg.setDepth(5000);

  // Center text vertically in the box
  const textX = boxX + boxW / 2;
  const textY = boxY + boxH / 2;
  const gameStartText = scene.add.text(textX, textY, "Survive 50 Waves!", {
    font: "40px Arial",
    fill: "#44aa44"
  }).setOrigin(0.5).setDepth(5001);

  // Disable Start Wave button while popup is visible
  if (scene.startWaveButton) {
    scene.startWaveButton.disableInteractive();
  }

  // Auto-close after 4 seconds
  scene.time.delayedCall(4000, () => {
    inputBlocker.destroy();
    popupBg.destroy();
    gameStartText.destroy();
    // Re-enable Start Wave button
    if (scene.startWaveButton) {
      scene.startWaveButton.setInteractive({ useHandCursor: true });
    }
  });
}
