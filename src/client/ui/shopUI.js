// Shop UI logic for tower selection, drawing, and refresh
// Exports functions to create and refresh the shop UI

import * as towerPlacement from "../logic/towerPlacement.js";

export function drawShopUI(scene, gameWidth, gameHeight, shopWidth, infoBarHeight, towerConfig) {
  // Draw tower shop (vertical panel on right)
  scene.shopArea = scene.add.graphics();
  scene.shopArea.fillStyle(0xffffff, 1); // fully opaque
  scene.shopArea.fillRect(gameWidth - shopWidth, 0, shopWidth, gameHeight - infoBarHeight);
  scene.shopArea.setDepth(3000);

  // Tooltip for tower descriptions: create once per scene, not per UI
  if (!scene.shopTooltip || scene.shopTooltip._destroyed) {
    scene.shopTooltip = scene.add.text(0, 0, '', {
      font: '16px Arial',
      fill: '#222',
      backgroundColor: 'rgba(255,255,255,0.97)',
      padding: { left: 12, right: 12, top: 10, bottom: 10 },
      wordWrap: { width: 260 },
      align: 'center',
      // Enable BBCode/rich text if Phaser supports it
      // (Phaser 3.50+ supports BBCode in Text objects)
      // If not, fallback to plain text
    })
      .setDepth(4000)
      .setVisible(false)
      .setScrollFactor(0)
      .setAlpha(0.99);
    scene.shopTooltip._destroyed = false;
  }
  // Hide tooltip on shop refresh
  if (scene.shopTooltip && scene.shopTooltip.setVisible) {
    scene.shopTooltip.setVisible(false);
  }

  // Set starting gold before shop grid (if not already set)
  if (typeof scene.goldAmount !== 'number') scene.goldAmount = 450;

  // Get all towers from config (object keys)
  const towerKeys = Object.keys(towerConfig);
  const cols = 2;
  const cellWidth = shopWidth / cols;
  const cellHeight = 100;
  const rows = Math.floor((gameHeight - infoBarHeight) / cellHeight);
  
  // Draw the shop grid above the background but below tower images
  if (scene.shopGrid) {
    scene.shopGrid.clear();
  } else {
    scene.shopGrid = scene.add.graphics();
  }
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
        // Guard: check if scene still exists and shopTooltip is valid
        if (!scene || !scene.shopTooltip || scene.shopTooltip.active === false) return;
        
        const name = config.displayName || key;
        const desc = config.description;
        // Use BBCode for style if supported
        // Tower name: large, bold, colored
        // Description: slightly larger, colored
        let richText = `[color=#ffb300][b][size=22]${name}[/size][/b][/color]\n[color=#3a7cff][size=16]${desc}[/size][/color]`;
        // Fallback for non-BBCode support
        if (!scene.shopTooltip.style.richText) {
          richText = name.toUpperCase() + '\n' + desc;
        }
        scene.shopTooltip.setText(richText);
        // Clamp tooltip x so it doesn't go off the right edge
        let tooltipX = towerImage.x - scene.shopTooltip.width / 2;
        const maxX = scene.sys.game.config.width - scene.shopTooltip.width - 8;
        if (tooltipX + scene.shopTooltip.width > scene.sys.game.config.width) {
          tooltipX = maxX;
        }
        if (tooltipX < 8) tooltipX = 8;
        scene.shopTooltip.setPosition(
          tooltipX,
          towerImage.y + cellHeight / 2 + 8
        );
        scene.shopTooltip.setVisible(true);
      });
      towerImage.on('pointerout', () => {
        // Guard: check if scene still exists
        if (!scene || !scene.shopTooltip) return;
        scene.shopTooltip.setVisible(false);
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
  scene.shopTowerItems.forEach(item => {
    // Skip placeholder cells (no config)
    if (!item.config) {
      item.image.setAlpha(0.07);
      item.image.setInteractive({ useHandCursor: false });
      return;
    }
    const canAfford = currentGold >= item.config.cost;
    item.image.setAlpha(canAfford ? 1 : 0.07);
    item.image.setInteractive({ useHandCursor: canAfford });
    item.priceText.setStyle({
      fill: canAfford ? '#008000' : '#888',
      font: canAfford ? 'bold 14px Arial' : '14px Arial'
    });
  });
}
