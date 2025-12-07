// Scene UI cleanup/reset utilities
export function cleanupSceneUI(scene) {
  if (scene.children && scene.children.list) {
    [...scene.children.list].forEach(child => {
      if (child && typeof child.destroy === 'function') child.destroy();
    });
  }
  if (scene.mainArea && typeof scene.mainArea.destroy === 'function') {
    scene.mainArea.destroy();
    scene.mainArea = null;
  }
  if (scene.enemyGraphics && typeof scene.enemyGraphics.destroy === 'function') {
    scene.enemyGraphics.destroy();
    scene.enemyGraphics = null;
  }
  scene.activeTowerRangeCircle = null;
  scene.dragRangeCircle = null;
}

export function resetSceneUIElements(scene) {
  // Add any additional UI reset logic here as needed
  if (scene.upgradeUI && typeof scene.upgradeUI.destroy === 'function') {
    scene.upgradeUI.destroy();
    scene.upgradeUI = null;
  }
  if (scene.upgradeTooltip && typeof scene.upgradeTooltip.destroy === 'function') {
    scene.upgradeTooltip.destroy();
    scene.upgradeTooltip = null;
  }
  scene.selectedTowerForUpgradeUI = null;
}
