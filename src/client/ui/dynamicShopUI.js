/**
 * Dynamic Shop UI Module
 * Automatically generates shop UI based on tower.json config
 * Adding new towers to config automatically adds them to the shop
 */

import * as towerPlacement from "../logic/towerPlacement.js";
import { getAvailableTowers, getTowerShopInfo } from "../factories/towerFactory.js";
import { GAME_PHASES } from "../state/gameStateManager.js";

/**
 * Draw dynamic shop UI based on tower config
 * Shop automatically adapts to the number of towers in config
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} gameWidth - Game width
 * @param {number} gameHeight - Game height
 * @param {number} shopWidth - Shop panel width
 * @param {number} infoBarHeight - Info bar height
 * @param {Object} towerConfig - Tower configuration object
 */
export function drawDynamicShopUI(scene, gameWidth, gameHeight, shopWidth, infoBarHeight, towerConfig) {
  // Get all available towers sorted by cost
  const availableTowers = getAvailableTowers(towerConfig);

  // Set starting gold before shop grid (if not already set)
  if (typeof scene.goldAmount !== 'number') scene.goldAmount = 450;

  // Draw tower shop background (vertical panel on right)
  scene.shopArea = scene.add.graphics();
  scene.shopArea.fillStyle(0xffffff, 1); // fully opaque
  scene.shopArea.fillRect(gameWidth - shopWidth, 0, shopWidth, gameHeight - infoBarHeight);
  scene.shopArea.setDepth(22);

  // Calculate grid layout based on number of towers
  const cols = 2; // 2 columns per row
  const cellWidth = shopWidth / cols;
  const cellHeight = 100;

  scene.shopGrid = scene.add.graphics();
  scene.shopGrid.lineStyle(3, 0x000000, 1);

  // Draw shop cells and tower items
  availableTowers.forEach(([towerKey, config], idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = gameWidth - shopWidth + col * cellWidth;
    const y = row * cellHeight;

    // Draw cell border
    scene.shopGrid.strokeRect(x, y, cellWidth, cellHeight);

    // Get shop info
    const shopInfo = getTowerShopInfo(towerConfig, towerKey);
    const canAfford = scene.goldAmount >= config.cost;

    // Load and display tower image
    const imgKey = `${towerKey}_shop`;
    if (shopInfo.image && !scene.textures.exists(imgKey)) {
      scene.load.image(imgKey, shopInfo.image);
      scene.load.start();
    }

    const towerImage = scene.add.image(x + cellWidth / 2, y + cellHeight / 2, imgKey)
      .setDisplaySize(cellWidth * 0.8, cellHeight * 0.8)
      .setDepth(100);

    towerImage.setInteractive({ useHandCursor: canAfford });
    towerImage.setAlpha(canAfford ? 1 : 0.07);

    // Handle tower drag from shop
    towerImage.on('pointerdown', (pointer) => {
      // Hide active range circle if present
      if (scene.activeTowerRangeCircle) {
        scene.activeTowerRangeCircle.destroy();
        scene.activeTowerRangeCircle = null;
      }

      // Only allow drag if player can afford
      if (!canAfford) {
        return;
      }

      // Check if this is a trap (clump_spike or bomb_trap) - only allow during SPAWNING phase
      const isTrap = towerKey === 'clump' || towerKey === 'bomb';
      if (isTrap && scene.gameStateMachine) {
        const isSpawning = scene.gameStateMachine.isInPhase && scene.gameStateMachine.isInPhase(GAME_PHASES.SPAWNING);
        if (!isSpawning) {
          return; // Can't drag trap when not spawning
        }
      }

      // Start drag using modular placement function
      const range = config.range || 100;
      towerPlacement.startTowerDrag(scene, pointer, imgKey, config.cost, range, towerKey);
    });

    // Display price below tower
    const priceText = scene.add.text(
      x + cellWidth / 2,
      y + cellHeight / 2 + 40,
      `$${config.cost}`,
      {
        font: canAfford ? "bold 14px Arial" : "14px Arial",
        fill: canAfford ? "#008000" : "#888"
      }
    ).setOrigin(0.5);
    priceText.setDepth(101);

    // Store reference for later updates
    if (!scene.shopTowerItems) scene.shopTowerItems = [];
    scene.shopTowerItems.push({
      index: idx,
      towerKey,
      image: towerImage,
      priceText,
      config
    });
  });
}

/**
 * Refresh shop availability based on current gold and game phase
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function refreshDynamicShopAvailability(scene) {
  if (!scene.shopTowerItems) return;

  // Check if currently in SPAWNING phase (for trap availability)
  let isSpawning = false;
  if (scene.gameStateMachine) {
    isSpawning = scene.gameStateMachine.isInPhase && scene.gameStateMachine.isInPhase(GAME_PHASES.SPAWNING);
  }

  scene.shopTowerItems.forEach(item => {
    const canAfford = scene.goldAmount >= item.config.cost;
    const isTrap = item.towerKey === 'clump' || item.towerKey === 'bomb';
    // Traps are only available during wave (SPAWNING phase)
    const isAvailable = canAfford && (!isTrap || isSpawning);

    // Update image
    item.image.setAlpha(isAvailable ? 1 : 0.07);
    item.image.setInteractive({ useHandCursor: isAvailable });

    // Update price text
    item.priceText.setStyle({
      fill: isAvailable ? '#008000' : '#888',
      font: isAvailable ? 'bold 14px Arial' : '14px Arial'
    });
  });
}
