import { showRangeCircle } from "../logic/towerPlacement.js";

/**
 * Update only the visual state of upgrade buttons (affordability, color)
 * without destroying and recreating them
 */
function updateUpgradeButtonAffordability(scene, placedTower, towerConfig) {
  if (!placedTower.unlockedUpgrades) placedTower.unlockedUpgrades = { left: 0, right: 0 };
  
  const towerTypeToConfigKey = {
    'knife_tower': 'knife',
    'cannon': 'cannon',
    'glacial': 'glacial',
    'impact': 'impact'
  };
  const configKey = towerTypeToConfigKey[placedTower.towerType] || placedTower.towerType;
  const upgrades = towerConfig[configKey]?.upgrades;
  
  if (!upgrades) return;
  
  const leftTier = placedTower.unlockedUpgrades.left;
  const rightTier = placedTower.unlockedUpgrades.right;
  
  let leftUpgrade, rightUpgrade;
  // Special case: ImpactTower uses its own left upgrade (not range)
  if (placedTower.towerType === 'impact') {
    if (leftTier < 1) {
      leftUpgrade = upgrades.lower[0];
    } else if (leftTier < 2) {
      leftUpgrade = upgrades.medium[0];
    } else if (leftTier < 3) {
      leftUpgrade = upgrades.high[0];
    }
  } else {
    if (leftTier < 1) {
      leftUpgrade = upgrades.lower[0];
    } else if (leftTier < 2) {
      leftUpgrade = upgrades.medium[0];
    } else if (leftTier < 3) {
      leftUpgrade = upgrades.high[0];
    }
  }
  
  if (rightTier < 1) {
    rightUpgrade = upgrades.lower[1];
  } else if (rightTier < 2) {
    rightUpgrade = upgrades.medium[1];
  } else if (rightTier < 3) {
    rightUpgrade = upgrades.high[1];
  }
  
  const leftAffordable = leftUpgrade ? scene.goldAmount >= leftUpgrade.cost : false;
  const rightAffordable = rightUpgrade ? scene.goldAmount >= rightUpgrade.cost : false;
  
  // Update left button state
  if (scene.upgradeUI._leftBtn) {
    const isMaxLeft = leftTier >= 3;
    scene.upgradeUI._leftBtn.setFill(isMaxLeft ? '#bbb' : (leftAffordable ? '#fff' : '#bbb'));
    scene.upgradeUI._leftBtn.setAlpha(isMaxLeft ? 0.5 : (leftAffordable ? 1 : 0.5));
    // Always update cursor correctly
    if (scene.upgradeUI._leftBtn.input) {
      scene.upgradeUI._leftBtn.input.useHandCursor = !isMaxLeft && leftAffordable;
    }
  }
  
  // Update right button state
  if (scene.upgradeUI._rightBtn) {
    const isMaxRight = rightTier >= 3;
    scene.upgradeUI._rightBtn.setFill(isMaxRight ? '#bbb' : (rightAffordable ? '#fff' : '#bbb'));
    scene.upgradeUI._rightBtn.setAlpha(isMaxRight ? 0.5 : (rightAffordable ? 1 : 0.5));
    // Always update cursor correctly
    if (scene.upgradeUI._rightBtn.input) {
      scene.upgradeUI._rightBtn.input.useHandCursor = !isMaxRight && rightAffordable;
    }
  }
}

export function refreshUpgradeUIIfVisible(scene, towerConfig) {
  // Only update affordability if UI exists and buttons are visible
  if (scene.upgradeUI && scene.selectedTowerForUpgradeUI && scene.upgradeUI.list && scene.upgradeUI.list.length > 0) {
    updateUpgradeButtonAffordability(scene, scene.selectedTowerForUpgradeUI, towerConfig);
  }
}
export function showUpgradeUI(scene, placedTower, towerConfig) {
  // Hide upgrade UI for clumpspike (must be first)
  if (placedTower && placedTower.towerType === 'clumpspike') {
    if (scene.upgradeUI && typeof scene.upgradeUI.destroy === 'function') {
      scene.upgradeUI.destroy();
      scene.upgradeUI = null;
    } else if (scene.upgradeUI) {
      scene.upgradeUI.setVisible(false);
      scene.upgradeUI = null;
    }
    return;
  }
  // Hide upgrade UI for bomb_trap
  if (placedTower && placedTower.towerType === 'bomb_trap') {
    if (scene.upgradeUI && typeof scene.upgradeUI.destroy === 'function') {
      scene.upgradeUI.destroy();
      scene.upgradeUI = null;
    } else if (scene.upgradeUI) {
      scene.upgradeUI.setVisible(false);
      scene.upgradeUI = null;
    }
    return;
  }
  
  // Get upgrades config for this tower
  const towerTypeToConfigKey = {
    'knife_tower': 'knife',
    'cannon': 'cannon',
    'glacial': 'glacial',
    'impact': 'impact'
  };
  const configKey = towerTypeToConfigKey[placedTower.towerType] || placedTower.towerType;
  const upgrades = towerConfig[configKey]?.upgrades;
  
  if (!upgrades || Object.keys(upgrades).length === 0) {
    // No upgrades for this tower, hide UI
    if (scene.upgradeUI && typeof scene.upgradeUI.destroy === 'function') {
      scene.upgradeUI.destroy();
      scene.upgradeUI = null;
    } else if (scene.upgradeUI) {
      scene.upgradeUI.setVisible(false);
      scene.upgradeUI = null;
    }
    return;
  }
  
  // Destroy existing UI if present
  if (scene.upgradeUI && typeof scene.upgradeUI.destroy === 'function') {
    scene.upgradeUI.destroy();
  }
  
  // Create new UI container
  scene.upgradeUI = scene.add.container(0, 0);
  scene.upgradeUI.setDepth(2000); // Ensure upgrade UI is above info bar and background
  
  // Create or reset tooltip
  if (!scene.upgradeTooltip || scene.upgradeTooltip._destroyed) {
    scene.upgradeTooltip = scene.add.text(0, 0, '', {
      fontFamily: 'Montserrat, Segoe UI, Arial',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fff',
      align: 'center',
      padding: { left: 12, right: 12, top: 10, bottom: 10 },
      wordWrap: { width: 200 },
      stroke: '#000',
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 8, fill: true }
    }).setOrigin(0.5).setVisible(false).setDepth(5000);
    scene.upgradeTooltip._destroyed = false;
  }
  const upgradeTooltip = scene.upgradeTooltip;
  
  // Draw or update tooltip background box
  if (!scene.upgradeTooltipBg || scene.upgradeTooltipBg._destroyed) {
    scene.upgradeTooltipBg = scene.add.graphics();
    scene.upgradeTooltipBg.setDepth(4999).setVisible(false);
    scene.upgradeTooltipBg._destroyed = false;
  }
  const tooltipBg = scene.upgradeTooltipBg;
  
  // Position UI elements in bottom screen
  const baseX = 650; // Left of center
  const baseY = 849; // Bottom screen area (info bar)
  const offset = 90;
  const sellBtnOffset = 280;
  
  // Initialize unlockedUpgrades if missing
  if (!placedTower.unlockedUpgrades) placedTower.unlockedUpgrades = { left: 0, right: 0 };
  
  const leftTier = placedTower.unlockedUpgrades.left;
  const rightTier = placedTower.unlockedUpgrades.right;
  let leftUpgrade, rightUpgrade, leftText, rightText;
  // Special case: ImpactTower uses its own left upgrade (not range)
  if (placedTower.towerType === 'impact') {
    if (leftTier < 1) {
      leftUpgrade = upgrades.lower[0];
      leftText = leftUpgrade.name + '\n$' + leftUpgrade.cost;
    } else if (leftTier < 2) {
      leftUpgrade = upgrades.medium[0];
      leftText = leftUpgrade.name + '\n$' + leftUpgrade.cost;
    } else if (leftTier < 3) {
      leftUpgrade = upgrades.high[0];
      leftText = leftUpgrade.name + '\n$' + leftUpgrade.cost;
    } else {
      leftUpgrade = null;
      leftText = 'MAX';
    }
  } else {
    if (leftTier < 1) {
      leftUpgrade = upgrades.lower[0];
      leftText = leftUpgrade.name + '\n$' + leftUpgrade.cost;
    } else if (leftTier < 2) {
      leftUpgrade = upgrades.medium[0];
      leftText = leftUpgrade.name + '\n$' + leftUpgrade.cost;
    } else if (leftTier < 3) {
      leftUpgrade = upgrades.high[0];
      leftText = leftUpgrade.name + '\n$' + leftUpgrade.cost;
    } else {
      leftUpgrade = null;
      leftText = 'MAX';
    }
  }
  if (rightTier < 1) {
    rightUpgrade = upgrades.lower[1];
    rightText = rightUpgrade.name + '\n$' + rightUpgrade.cost;
  } else if (rightTier < 2) {
    rightUpgrade = upgrades.medium[1];
    rightText = rightUpgrade.name + '\n$' + rightUpgrade.cost;
  } else if (rightTier < 3) {
    rightUpgrade = upgrades.high[1];
    rightText = rightUpgrade.name + '\n$' + rightUpgrade.cost;
  } else {
    rightUpgrade = null;
    rightText = 'MAX';
  }
  // Left button
  const leftAffordable = leftUpgrade ? scene.goldAmount >= leftUpgrade.cost : false;
  const leftBtn = scene.add.text(baseX - offset, baseY, leftText,
    {
      font: leftText === 'MAX' ? 'bold 18px Arial' : 'bold 16px Arial',
      fill: leftText === 'MAX' ? '#999999' : (leftAffordable ? '#f5f5f5' : '#888888'),
      backgroundColor: leftText === 'MAX' ? '#0a0a0a' : (leftAffordable ? '#111111' : '#0f0f0f'),
      padding: { x: 20, y: 12 },
      stroke: leftText === 'MAX' ? '#555555' : (leftAffordable ? '#222222' : '#444444'),
      strokeThickness: leftText === 'MAX' ? 2 : 3,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: leftText === 'MAX' ? '#333333' : (leftAffordable ? '#ffb700' : '#ff3333'),
        blur: 18,
        fill: true
      }
    })
    .setOrigin(0.5);
  leftBtn.setAlpha(leftText === 'MAX' ? 0.4 : (leftAffordable ? 1 : 0.6));
  if (leftText !== 'MAX') {
    leftBtn.setInteractive({ useHandCursor: true, useCapture: true });
    // Set cursor state based on affordability
    leftBtn.input.useHandCursor = leftAffordable;
    // Tooltip events
    leftBtn.on('pointerover', (pointer) => {
      if (leftUpgrade && leftUpgrade.description) {
        upgradeTooltip.setText(leftUpgrade.description);
        upgradeTooltip.setPosition(leftBtn.x, leftBtn.y - 60);
        upgradeTooltip.setVisible(true);
        // Update tooltip background size and position
        const textBounds = upgradeTooltip.getBounds();
        tooltipBg.clear();
        tooltipBg.fillStyle(0x22232a, 1); // Opaque background
        tooltipBg.lineStyle(2, 0x444455, 1); // Subtle border
        tooltipBg.fillRoundedRect(textBounds.x - 10, textBounds.y - 10, textBounds.width + 20, textBounds.height + 20, 10);
        tooltipBg.strokeRoundedRect(textBounds.x - 10, textBounds.y - 10, textBounds.width + 20, textBounds.height + 20, 10);
        tooltipBg.setVisible(true);
      }
    });
    leftBtn.on('pointerout', () => {
      upgradeTooltip.setVisible(false);
      tooltipBg.setVisible(false);
    });
    leftBtn.on('pointerdown', (pointer, localX, localY, event) => {
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      if (leftUpgrade && scene.goldAmount >= leftUpgrade.cost && leftTier < 3) {
        placedTower.unlockedUpgrades.left++;
        scene.goldAmount -= leftUpgrade.cost;
        // Apply the upgrade effect if method exists
        // Always call upgrade on the logic tower, not the sprite
        const logicTower = (scene.gameLogic && Array.isArray(scene.gameLogic.towers))
          ? scene.gameLogic.towers.find(t => t._placedSprite === placedTower)
          : null;
        if (logicTower && typeof logicTower.applyUpgrade === 'function') {
          logicTower.applyUpgrade(leftUpgrade.key || leftUpgrade.name);
        }
        scene.goldText.setText(String(scene.goldAmount));
          // Refresh range circle if this tower is selected
          if (scene.selectedTowerForUpgradeUI === placedTower && placedTower.towerX !== undefined && placedTower.towerY !== undefined) {
            // Find the logic tower instance for this placed sprite
            const logicTower = (scene.gameLogic && Array.isArray(scene.gameLogic.towers))
              ? scene.gameLogic.towers.find(t => t._placedSprite === placedTower)
              : null;
              if (logicTower && logicTower.range && logicTower.towerType !== 'bird') {
                // Extra guard: never show range circle for BirdTower, even if towerType is missing or misnamed
                if (!logicTower.towerType || String(logicTower.towerType).toLowerCase() !== 'bird') {
                  let circleX = placedTower.x;
                  let circleY = placedTower.y;
                  showRangeCircle(scene, circleX, circleY, logicTower.range);
                }
            }
          }
        if (typeof scene.refreshUpgradeUIIfVisible === 'function') scene.refreshUpgradeUIIfVisible();
        // Force a full UI rebuild after upgrade to show next tier
        setTimeout(() => {
          if (scene.selectedTowerForUpgradeUI && typeof showUpgradeUI === 'function') {
            showUpgradeUI(scene, scene.selectedTowerForUpgradeUI, towerConfig);
          }
        }, 50);
      }
    });
  } else {
    leftBtn.disableInteractive();
    // Always hide and clear tooltip/background immediately when button is MAX
    if (scene.upgradeTooltip) {
      scene.upgradeTooltip.setVisible(false);
      scene.upgradeTooltip.setText('');
    }
    if (tooltipBg) tooltipBg.setVisible(false);
    leftBtn.on('pointerover', () => {
      if (scene.upgradeTooltip) {
        scene.upgradeTooltip.setVisible(false);
        scene.upgradeTooltip.setText('');
      }
      if (tooltipBg) tooltipBg.setVisible(false);
    });
    leftBtn.on('pointerout', () => {
      if (scene.upgradeTooltip) {
        scene.upgradeTooltip.setVisible(false);
        scene.upgradeTooltip.setText('');
      }
      if (tooltipBg) tooltipBg.setVisible(false);
    });
  }
  scene.upgradeUI.add(leftBtn);
  scene.upgradeUI._leftBtn = leftBtn;
  // Right button
  const rightAffordable = rightUpgrade ? scene.goldAmount >= rightUpgrade.cost : false;
  const rightBtn = scene.add.text(baseX + offset, baseY, rightText,
    {
      font: rightText === 'MAX' ? 'bold 18px Arial' : 'bold 16px Arial',
      fill: rightText === 'MAX' ? '#999999' : (rightAffordable ? '#f5f5f5' : '#888888'),
      backgroundColor: rightText === 'MAX' ? '#0a0a0a' : (rightAffordable ? '#111111' : '#0f0f0f'),
      padding: { x: 20, y: 12 },
      stroke: rightText === 'MAX' ? '#555555' : (rightAffordable ? '#222222' : '#444444'),
      strokeThickness: rightText === 'MAX' ? 2 : 3,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: rightText === 'MAX' ? '#333333' : (rightAffordable ? '#ffb700' : '#ff3333'),
        blur: 18,
        fill: true
      }
    })
    .setOrigin(0.5);
  rightBtn.setAlpha(rightText === 'MAX' ? 0.4 : (rightAffordable ? 1 : 0.6));
  if (rightText !== 'MAX') {
    rightBtn.setInteractive({ useHandCursor: true, useCapture: true });
    // Set cursor state based on affordability
    rightBtn.input.useHandCursor = rightAffordable;
    // Tooltip events
    rightBtn.on('pointerover', (pointer) => {
      if (rightUpgrade && rightUpgrade.description) {
        upgradeTooltip.setText(rightUpgrade.description);
        upgradeTooltip.setPosition(rightBtn.x, rightBtn.y - 60);
        upgradeTooltip.setVisible(true);
        // Update tooltip background size and position
        const textBounds = upgradeTooltip.getBounds();
        tooltipBg.clear();
        tooltipBg.fillStyle(0x22232a, 1); // Opaque background
        tooltipBg.lineStyle(2, 0x444455, 1); // Subtle border
        tooltipBg.fillRoundedRect(textBounds.x - 10, textBounds.y - 10, textBounds.width + 20, textBounds.height + 20, 10);
        tooltipBg.strokeRoundedRect(textBounds.x - 10, textBounds.y - 10, textBounds.width + 20, textBounds.height + 20, 10);
        tooltipBg.setVisible(true);
      }
    });
    rightBtn.on('pointerout', () => {
      upgradeTooltip.setVisible(false);
      tooltipBg.setVisible(false);
    });
    rightBtn.on('pointerdown', (pointer, localX, localY, event) => {
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      if (rightUpgrade && scene.goldAmount >= rightUpgrade.cost && rightTier < 3) {
        placedTower.unlockedUpgrades.right++;
        scene.goldAmount -= rightUpgrade.cost;
        // Apply the upgrade effect if method exists
        // Always call upgrade on the logic tower, not the sprite
        const logicTower = (scene.gameLogic && Array.isArray(scene.gameLogic.towers))
          ? scene.gameLogic.towers.find(t => t._placedSprite === placedTower)
          : null;
        if (logicTower && typeof logicTower.applyUpgrade === 'function') {
          logicTower.applyUpgrade(rightUpgrade.key || rightUpgrade.name);
        }
        scene.goldText.setText(String(scene.goldAmount));
          // Refresh range circle if this tower is selected
          if (scene.selectedTowerForUpgradeUI === placedTower && placedTower.towerX !== undefined && placedTower.towerY !== undefined) {
            const logicTower = (scene.gameLogic && Array.isArray(scene.gameLogic.towers))
              ? scene.gameLogic.towers.find(t => t._placedSprite === placedTower)
              : null;
            if (logicTower && logicTower.range) {
              // Do not display range circle for BirdTower
              if (logicTower.towerType !== 'bird') {
                let circleX = placedTower.x;
                let circleY = placedTower.y;
                showRangeCircle(scene, circleX, circleY, logicTower.range);
              }
            }
          }
        if (typeof scene.refreshUpgradeUIIfVisible === 'function') scene.refreshUpgradeUIIfVisible();
        // Force a full UI rebuild after upgrade to show next tier
        setTimeout(() => {
          if (scene.selectedTowerForUpgradeUI && typeof showUpgradeUI === 'function') {
            showUpgradeUI(scene, scene.selectedTowerForUpgradeUI, towerConfig);
          }
        }, 50);
      }
    });
  } else {
    rightBtn.disableInteractive();
    // Always hide and clear tooltip/background immediately when button is MAX
    if (scene.upgradeTooltip) {
      scene.upgradeTooltip.setVisible(false);
      scene.upgradeTooltip.setText('');
    }
    if (tooltipBg) tooltipBg.setVisible(false);
    rightBtn.on('pointerover', () => {
      if (scene.upgradeTooltip) {
        scene.upgradeTooltip.setVisible(false);
        scene.upgradeTooltip.setText('');
      }
      if (tooltipBg) tooltipBg.setVisible(false);
    });
    rightBtn.on('pointerout', () => {
      if (scene.upgradeTooltip) {
        scene.upgradeTooltip.setVisible(false);
        scene.upgradeTooltip.setText('');
      }
      if (tooltipBg) tooltipBg.setVisible(false);
    });
  }
  scene.upgradeUI.add(rightBtn);
  scene.upgradeUI._rightBtn = rightBtn;

  // --- SELL BUTTON ---
  // Calculate sell value: base cost + sum of purchased upgrades, times 0.8
  let baseCost = towerConfig[configKey]?.cost || 0;
  let upgradesBought = [];
  // Find the logic tower instance for this placed sprite
  const logicTower = (scene.gameLogic && Array.isArray(scene.gameLogic.towers))
    ? scene.gameLogic.towers.find(t => t._placedSprite === placedTower)
    : null;
  if (logicTower && Array.isArray(logicTower.upgrades)) {
    upgradesBought = logicTower.upgrades;
  }
  // Get all upgrade costs for this tower
  let allUpgradeDefs = [];
  if (upgrades) {
    allUpgradeDefs = [
      ...(upgrades.lower || []),
      ...(upgrades.medium || []),
      ...(upgrades.high || [])
    ];
  }
  let upgradesTotal = 0;
  for (const key of upgradesBought) {
    const def = allUpgradeDefs.find(u => u.key === key || u.name === key);
    if (def && typeof def.cost === 'number') upgradesTotal += def.cost;
  }
  const sellValue = Math.floor(0.8 * (baseCost + upgradesTotal));
  const sellBtn = scene.add.text(baseX + sellBtnOffset, baseY, `Sell\n+$${sellValue}`,
    {
      font: 'bold 16px Arial',
      fill: '#f5f5f5',
      backgroundColor: '#4a2020',
      padding: { left: 10, right: 20, y: 12 },
      stroke: '#222222',
      strokeThickness: 3,
      align: 'center',
      fixedWidth: 80,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#4CAF50',
        blur: 18,
        fill: true
      }
    })
    .setOrigin(0.5);
  sellBtn.setInteractive({ useHandCursor: true });
  sellBtn.on('pointerdown', () => {
    // Remove the tower and give gold
    if (logicTower) {
      // Remove from game logic
      if (scene.gameLogic && Array.isArray(scene.gameLogic.towers)) {
        const idx = scene.gameLogic.towers.indexOf(logicTower);
        if (idx !== -1) scene.gameLogic.towers.splice(idx, 1);
      }
      // Remove placed sprite
      if (logicTower._placedSprite && logicTower._placedSprite.destroy) logicTower._placedSprite.destroy();
      // Remove any projectiles or special sprites (e.g., laser, spikes)
      if (logicTower._laserSprite && logicTower._laserSprite.destroy) logicTower._laserSprite.destroy();
      if (logicTower._spikes && Array.isArray(logicTower._spikes)) {
        for (const s of logicTower._spikes) if (s && s.destroy) s.destroy();
      }
      // Remove ovni beam if present
      if (logicTower._beamSprite && logicTower._beamSprite.destroy) logicTower._beamSprite.destroy();
    }
    // Remove range circle if present
    if (scene.activeTowerRangeCircle && scene.activeTowerRangeCircle.destroy) {
      scene.activeTowerRangeCircle.destroy();
      scene.activeTowerRangeCircle = null;
    }
    // Remove BirdTower selection circle if present
    if (scene._birdSelectCircle && typeof scene._birdSelectCircle.destroy === 'function') {
      scene._birdSelectCircle.destroy();
      scene._birdSelectCircle = null;
    }
    // Add gold
    scene.goldAmount += sellValue;
    if (scene.goldText) scene.goldText.setText(String(scene.goldAmount));
    // Hide upgrade UI
    if (scene.upgradeUI) scene.upgradeUI.setVisible(false);
    // Hide upgrade tooltip if present
    if (scene.upgradeTooltip && scene.upgradeTooltip.setVisible) {
      scene.upgradeTooltip.setVisible(false);
    }
    scene.selectedTowerForUpgradeUI = null;
    // Optionally refresh shop
    if (typeof scene._refreshShopAvailability === 'function') scene._refreshShopAvailability();
  });
  scene.upgradeUI.add(sellBtn);
  
  // Draw range circle for the newly selected tower (unless it's a BirdTower)
  if (placedTower.towerX !== undefined && placedTower.towerY !== undefined) {
    const logicTower = (scene.gameLogic && Array.isArray(scene.gameLogic.towers))
      ? scene.gameLogic.towers.find(t => t._placedSprite === placedTower)
      : null;
    if (logicTower && logicTower.range) {
      if (logicTower.towerType === 'bird') {
        // BirdTower: hide range circle, show selection circle instead
        if (scene.activeTowerRangeCircle && scene.activeTowerRangeCircle.destroy) {
          scene.activeTowerRangeCircle.destroy();
          scene.activeTowerRangeCircle = null;
        }
      } else {
        // Other towers: show range circle
        showRangeCircle(scene, placedTower.x, placedTower.y, logicTower.range);
      }
    }
  }
}
