// Start Wave Button & Wave Text UI module
export function createStartWaveButton(scene, x, y, onStartWave) {
  const button = scene.add.text(x, y, "Start Wave", {
    font: "28px Arial",
    fill: "#00ff00",
    backgroundColor: "#222",
    padding: { x: 20, y: 10 }
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
    font: "20px Arial",
    fill: "#fff"
  }).setOrigin(0, 0.5).setDepth(2001);
}
