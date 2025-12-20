// Start Wave Button & Wave Text UI module
import { GAME_SCALE } from "../utils/scaleConfig.js";

export function createStartWaveButton(scene, x, y, onStartWave) {
  const button = scene.add.text(x, y, "Start Wave", {
    font: `${Math.round(28 * GAME_SCALE)}px Arial`,
    fill: "#00ff00",
    backgroundColor: "#222",
    padding: { x: Math.round(20 * GAME_SCALE), y: Math.round(10 * GAME_SCALE) }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  button.setDepth(5000);
  button.input.enabled = true;
  button.on("pointerdown", () => {
    if (typeof onStartWave === 'function') onStartWave();
  });
  return button;
}

export function createWaveText(scene, x, y, waveNumber) {
  return scene.add.text(x, y, `Wave: ${waveNumber}`, {
    font: `${Math.round(20 * GAME_SCALE)}px Arial`,
    fill: "#fff"
  }).setOrigin(0, 0.5).setDepth(2001);
}
