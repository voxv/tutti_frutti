// Shop UI logic for tower selection, drawing, and refresh
// Exports functions to create and refresh the shop UI

import * as towerPlacement from "../logic/towerPlacement.js";
import { GAME_PHASES } from "../state/gameStateManager.js";

export function drawShopUI(scene, gameWidth, gameHeight, shopWidth, infoBarHeight, towerConfig) {
  // Draw tower shop (vertical panel on right)
  scene.shopArea = scene.add.graphics();
  scene.shopArea.fillStyle(0xffffff, 1); // fully opaque
  scene.shopArea.fillRect(gameWidth - shopWidth, 0, shopWidth, gameHeight - infoBarHeight);
  scene.shopArea.setDepth(3000);

  // Tooltip for tower descriptions: create once per scene, not per UI
  if (!scene.shopTooltipBg || scene.shopTooltipBg._destroyed) {
    // Background graphics for rounded rectangle and drop shadow
    scene.shopTooltipBg = scene.add.graphics();
    scene.shopTooltipBg.setDepth(100001).setVisible(false);
    scene.shopTooltipBg._destroyed = false;
  }
  if (!scene.shopTooltip || scene.shopTooltip._destroyed) {
    scene.shopTooltip = scene.add.text(0, 0, '', {
      fontFamily: 'Montserrat, Segoe UI, Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff',
      align: 'center',
      padding: { left: 18, right: 18, top: 14, bottom: 14 },
      wordWrap: { width: 300 },
      shadow: { offsetX: 0, offsetY: 3, color: '#000', blur: 8, fill: true },
      // BBCode/rich text supported
    })
      .setDepth(100002) // Ensure text is above background
      .setVisible(false)
      .setScrollFactor(0)
      .setAlpha(0);
    scene.shopTooltip._destroyed = false;
  }
  // Hide tooltip on shop refresh
  if (scene.shopTooltip && scene.shopTooltip.setVisible) {
    scene.shopTooltip.setVisible(false);
    if (scene.shopTooltipBg) scene.shopTooltipBg.setVisible(false);
  }

  // Set starting gold before shop grid (if not already set)
  if (typeof scene.goldAmount !== 'number') scene.goldAmount = 450;

  // Get all towers from config (object keys)
  const towerKeys = Object.keys(towerConfig);
  const cols = 2;
  const cellWidth = shopWidth / cols;
  const cellHeight = 100;
  const rows = Math.floor((gameHeight - infoBarHeight) / cellHeight);
  
  // Always create a new shopGrid graphics object to avoid issues after replay
  if (scene.shopGrid && typeof scene.shopGrid.destroy === 'function') {
    scene.shopGrid.destroy();
  }
  scene.shopGrid = scene.add.graphics();
  scene.shopGrid.setDepth(3001); // Ensure grid is above background (22) and above all towers
  scene.shopGrid.lineStyle(3, 0x000000, 1);

  // Destroy old shop images and price texts before redrawing
  if (scene.shopTowerItems && Array.isArray(scene.shopTowerItems)) {
    for (const item of scene.shopTowerItems) {
      if (item.image && item.image.destroy) item.image.destroy();
      if (item.priceText && item.priceText.destroy) item.priceText.destroy();
    }
  }
  scene.shopTowerItems = [];
  const totalCells = rows * cols;

  // First, draw the complete grid with all cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gameWidth - shopWidth + c * cellWidth;
      const y = r * cellHeight;
      scene.shopGrid.strokeRect(x, y, cellWidth, cellHeight);
    }
  }
  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = gameWidth - shopWidth + col * cellWidth;
    const y = row * cellHeight;
    scene.shopGrid.strokeRect(x, y, cellWidth, cellHeight);

    let imgKey = 'tower_1';
    let price = '';
    let canAfford = false;
    let config = null;
    if (i < towerKeys.length) {
      const key = towerKeys[i];
      config = towerConfig[key];
      // Use the towerType directly (should match preloaded key)
      imgKey = config.towerType || key;
      price = config.cost;
      canAfford = scene.goldAmount >= price;
    }
    let scale = 0.6;
    if (config && config.assets && typeof config.assets.shopImageScale === 'number') {
      scale = config.assets.shopImageScale * 0.6;
    } else if (config && typeof config.shopImageScale === 'number') {
      scale = config.shopImageScale * 0.6;
    }
    const towerImage = scene.add.image(x + cellWidth / 2, y + cellHeight / 2, imgKey)
      .setDisplaySize(cellWidth * scale, cellHeight * scale)
      .setDepth(3002);
    towerImage.setInteractive({ useHandCursor: !!config && canAfford });
    towerImage.setAlpha(config ? (canAfford ? 1 : 0.07) : 0.07);
    towerImage.on('pointerdown', (pointer) => {
      if (!config) return;
      // Always check affordability at click time (not just at draw time)
      const currentGold = typeof scene.goldAmount === 'number' ? scene.goldAmount : 0;
      // Deselect any selected tower before starting drag
      // Robustly destroy upgrade UI if present
      if (scene.upgradeUI && typeof scene.upgradeUI.destroy === 'function') {
        scene.upgradeUI.destroy();
        scene.upgradeUI = null;
      } else if (scene.upgradeUI) {
        scene.upgradeUI.setVisible(false);
        scene.upgradeUI = null;
      }
      if (typeof window !== 'undefined' && window.inputHandlers && typeof window.inputHandlers.deselectTower === 'function') {
        window.inputHandlers.deselectTower(scene);
      } else if (typeof scene.deselectTower === 'function') {
        scene.deselectTower();
      } else {
        scene.selectedTowerForUpgradeUI = null;
      }
      if (scene.activeTowerRangeCircle) {
        scene.activeTowerRangeCircle.destroy();
        scene.activeTowerRangeCircle = null;
      }
      if (currentGold < price) {
        // Not enough gold, do not allow drag
        return;
      }
      // Get tower range from config
      const range = config.range || 100;
      // Start drag using modular placement function
      towerPlacement.startTowerDrag(scene, pointer, imgKey, price, range);
    });
    // Tooltip on hover
    if (config && config.description) {
      towerImage.on('pointerover', (pointer) => {
        if (!scene || !scene.shopTooltip || scene.shopTooltip.active === false) return;
        const name = config.displayName || key;
        const desc = config.description;
        // Modern BBCode style: gold title, blue desc, larger, bold, with shadow
        let richText = `[color=#ffe066][b][size=26]${name}[/size][/b][/color]\n[color=#7ecfff][size=18]${desc}[/size][/color]`;
        if (!scene.shopTooltip.style.richText) {
          richText = name.toUpperCase() + '\n' + desc;
        }
        scene.shopTooltip.setText(richText);
        // Calculate tooltip position
        let tooltipX = towerImage.x - scene.shopTooltip.width / 2;
        const maxX = scene.sys.game.config.width - scene.shopTooltip.width - 16;
        if (tooltipX + scene.shopTooltip.width > scene.sys.game.config.width) {
          tooltipX = maxX;
        }
        if (tooltipX < 16) tooltipX = 16;
        const tooltipY = towerImage.y + cellHeight / 2 + 12;
        scene.shopTooltip.setPosition(tooltipX, tooltipY);
        // Draw background with rounded corners and drop shadow
        if (scene.shopTooltipBg) {
          scene.shopTooltipBg.clear();
          scene.shopTooltipBg.fillStyle(0x232946, 0.96);
          scene.shopTooltipBg.fillRoundedRect(
            tooltipX - 12,
            tooltipY - 10,
            scene.shopTooltip.width + 24,
            scene.shopTooltip.height + 20,
            18
          );
          // Border glow
          scene.shopTooltipBg.lineStyle(4, 0x7ecfff, 0.7);
          scene.shopTooltipBg.strokeRoundedRect(
            tooltipX - 12,
            tooltipY - 10,
            scene.shopTooltip.width + 24,
            scene.shopTooltip.height + 20,
            18
          );
          scene.shopTooltipBg.setVisible(true);
        }
        // Fade in
        scene.tweens.add({
          targets: scene.shopTooltip,
          alpha: 1,
          duration: 120,
          ease: 'Quad.easeOut',
          onStart: () => scene.shopTooltip.setVisible(true)
        });
      });
      towerImage.on('pointerout', () => {
        if (!scene || !scene.shopTooltip) return;
        scene.shopTooltip.setVisible(false);
        if (scene.shopTooltipBg) scene.shopTooltipBg.setVisible(false);
        scene.shopTooltip.setAlpha(0);
      });
    }
    // Always display price below tower (or blank for placeholder)
    const priceText = scene.add.text(x + cellWidth / 2, y + cellHeight / 2 + 40, config ? `$${price}` : '',
      {
        font: config && canAfford ? "bold 14px Arial" : "14px Arial",
        fill: config && canAfford ? "#008000" : "#888"
      }
    ).setOrigin(0.5);
    priceText.setDepth(3003);
    // Store references for refresh
    scene.shopTowerItems.push({
      image: towerImage,
      priceText,
      config,
      x, y, cellWidth, cellHeight
    });
  }
}

export function refreshShopAvailability(scene) {
  if (!scene.shopTowerItems) return;
  const currentGold = typeof scene.goldAmount === 'number' ? scene.goldAmount : 0;
  
  // Check if currently in SPAWNING phase (for trap availability)
  let isSpawning = false;
  if (scene.gameStateMachine) {
    isSpawning = scene.gameStateMachine.isInPhase && scene.gameStateMachine.isInPhase(GAME_PHASES.SPAWNING);
  }
  
  scene.shopTowerItems.forEach(item => {
    // Skip placeholder cells (no config)
    if (!item.config) {
      item.image.setAlpha(0.07);
      item.image.setInteractive({ useHandCursor: false });
      return;
    }
    const canAfford = currentGold >= item.config.cost;
    const isTrap = item.config.towerType === 'clump_spike' || item.config.towerType === 'bomb_trap';
    // Traps are only available during wave (SPAWNING phase)
    const isAvailable = canAfford && (!isTrap || isSpawning);
    
    item.image.setAlpha(isAvailable ? 1 : 0.07);
    item.image.setInteractive({ useHandCursor: isAvailable });
    item.priceText.setStyle({
      fill: isAvailable ? '#008000' : '#888',
      font: isAvailable ? 'bold 14px Arial' : '14px Arial'
    });
  });
}
