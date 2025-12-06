
import { pointInPolygon } from "./noBuildUtils.js";
/**
 * Tower Placement and Drag/Drop Logic Module
 * Handles tower placement, drag-and-drop UI, and range circle display
 */

const GAME_WIDTH = 1600;
const SHOP_WIDTH = 220;
const INFO_BAR_HEIGHT = 100;
const GAME_HEIGHT = 900;
const SHOP_CELL_WIDTH = SHOP_WIDTH / 2;
const SHOP_CELL_HEIGHT = 100;

// Minimum distance between towers (exclusion zone radius)
const EXCLUSION_RADIUS = 60;

/**
 * Initialize tower placement handlers for the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Object} options - Configuration options
 * @param {Function} options.onPlaceTower - Callback when tower is placed
 */
export function setupTowerPlacement(scene, options = {}) {
  // Create drag move handler
  scene._dragMoveHandler = function(pointer) {
    updateDragPosition(scene, pointer);
  };

  // Create drag drop handler
  scene._dragDropHandler = function(pointer) {
    dropTower(scene, pointer, options);
  };
}

/**
 * Start tower drag operation
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Phaser.Input.Pointer} pointer - The pointer event
 * @param {string} towerType - Tower type/image key
 * @param {number} price - Tower price
 * @param {number} range - Tower range for display
 */
export function startTowerDrag(scene, pointer, towerType, price, range) {
  // Clean up any existing drag operations
  cleanupDrag(scene);

  // Create draggable tower image
  scene.dragImage = scene.add.image(pointer.x, pointer.y, towerType)
    .setDisplaySize(SHOP_CELL_WIDTH * 0.6, SHOP_CELL_HEIGHT * 0.6)
    .setDepth(2000)
    .setAlpha(0.8);

  // Create range circle visualization only if not BirdTower
  if (towerType !== 'bird') {
    scene.dragRangeCircle = scene.add.graphics();
    scene.dragRangeCircle.setDepth(1999);
    scene.dragRangeCircle.fillStyle(0x00ff00, 0.18);
    scene.dragRangeCircle.fillCircle(pointer.x, pointer.y, range);
  } else {
    scene.dragRangeCircle = null;
  }

  // Store drag data
  scene.dragTowerType = towerType;
  scene.dragTowerPrice = price;
  scene.dragTowerRange = range;

  // Create move handler function
  const dragMoveHandler = (pointer) => updateDragPosition(scene, pointer);
  
  // Create drop handler function
  const dragDropHandler = (pointer) => {
    dropTower(scene, pointer, {});
    // Clean up handlers after drop
    scene.input.off('pointermove', dragMoveHandler, scene);
    scene.input.off('pointerup', dragDropHandler, scene);
  };

  // Store handlers on scene for potential cleanup
  scene._currentDragMoveHandler = dragMoveHandler;
  scene._currentDragDropHandler = dragDropHandler;

  // Attach input handlers
  scene.input.on('pointermove', dragMoveHandler, scene);
  scene.input.on('pointerup', dragDropHandler, scene);
}

/**
 * Update drag position during drag operation
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Phaser.Input.Pointer} pointer - The pointer event
 */
export function updateDragPosition(scene, pointer) {
  if (!scene.dragImage) return;

  // Update tower image position
  scene.dragImage.x = pointer.x;
  scene.dragImage.y = pointer.y;

  // Check for no-build polygons or out-of-bounds (shop/info bar)
  let inNoBuildZone = false;
  // Out of bounds: shop or info bar
  const inShopOrInfoBar =
    pointer.x < 0 || pointer.x >= GAME_WIDTH - SHOP_WIDTH ||
    pointer.y < 0 || pointer.y >= GAME_HEIGHT - INFO_BAR_HEIGHT;

  if (scene.gameLogic && scene.gameLogic.map && Array.isArray(scene.gameLogic.map.noBuildZones)) {
    for (const zone of scene.gameLogic.map.noBuildZones) {
      if (zone.type === 'polygon' && Array.isArray(zone.points) && zone.points.length > 2) {
        if (pointInPolygon(zone.points, [pointer.x, pointer.y])) {
          inNoBuildZone = true;
          break;
        }
      }
    }
  }

  // Check for overlap with existing placed tower sprites (EXCLUSION_RADIUS minimum distance)
  let tooCloseToOtherTower = false;
  if (scene && scene.children && Array.isArray(scene.children.list)) {
    for (const child of scene.children.list) {
      if (child && child.towerType && typeof child.x === 'number' && typeof child.y === 'number') {
        const dx = pointer.x - child.x;
        const dy = pointer.y - child.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < EXCLUSION_RADIUS) {
          tooCloseToOtherTower = true;
          break;
        }
      }
    }
  }

  // Update range circle position and visuals only if not BirdTower
  if (scene.dragRangeCircle && scene.dragTowerRange && scene.dragTowerType !== 'bird') {
    scene.dragRangeCircle.clear();
    if (inNoBuildZone || inShopOrInfoBar || tooCloseToOtherTower) {
      scene.dragRangeCircle.fillStyle(0xff3333, 0.25); // reddish
    } else {
      scene.dragRangeCircle.fillStyle(0x00ff00, 0.18); // green
    }
    scene.dragRangeCircle.fillCircle(pointer.x, pointer.y, scene.dragTowerRange);
  }
}

/**
 * Drop tower at position
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Phaser.Input.Pointer} pointer - The pointer event
 * @param {Object} options - Callback options
 */
export function dropTower(scene, pointer, options = {}) {
  if (!scene.dragImage) return;

  // Check if dropped inside valid game area (not shop/info bar)
  const isValidDropZone =
    pointer.x >= 0 && pointer.x < GAME_WIDTH - SHOP_WIDTH &&
    pointer.y >= 0 && pointer.y < GAME_HEIGHT - INFO_BAR_HEIGHT;

  // Check for no-build polygons
  let inNoBuildZone = false;
  if (scene.gameLogic && scene.gameLogic.map && Array.isArray(scene.gameLogic.map.noBuildZones)) {
    for (const zone of scene.gameLogic.map.noBuildZones) {
      if (zone.type === 'polygon' && Array.isArray(zone.points) && zone.points.length > 2) {
        if (pointInPolygon(zone.points, [pointer.x, pointer.y])) {
          inNoBuildZone = true;
          break;
        }
      }
    }
  }

  // Check for overlap with existing placed tower sprites (EXCLUSION_RADIUS minimum distance)
  let tooCloseToOtherTower = false;
  if (scene && scene.children && Array.isArray(scene.children.list)) {
    for (const child of scene.children.list) {
      // Only check sprites that are towers (placed on the map)
      if (child && child.towerType && typeof child.x === 'number' && typeof child.y === 'number') {
        const dx = pointer.x - child.x;
        const dy = pointer.y - child.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < EXCLUSION_RADIUS) {
          tooCloseToOtherTower = true;
          break;
        }
      }
    }
  }

  if (isValidDropZone && !inNoBuildZone && !tooCloseToOtherTower && scene.dragTowerPrice !== null) {
    // Only place if player can afford
    if (scene.goldAmount >= scene.dragTowerPrice) {
      if (typeof options.onPlaceTower === 'function') {
        options.onPlaceTower(pointer.x, pointer.y, scene.dragTowerType, scene.dragTowerPrice);
      } else if (scene._placeTowerAt) {
        scene._placeTowerAt(pointer.x, pointer.y, scene.dragTowerType, scene.dragTowerPrice);
      }
    }
  }

  // Clean up drag operation
  cleanupDrag(scene);
}

/**
 * Clean up drag operation (destroy images, remove handlers)
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function cleanupDrag(scene) {
  if (scene.dragImage) {
    scene.dragImage.destroy();
    scene.dragImage = null;
  }

  if (scene.dragRangeCircle) {
    scene.dragRangeCircle.destroy();
    scene.dragRangeCircle = null;
  }

  // Remove current drag input handlers if they exist
  if (scene._currentDragMoveHandler) {
    scene.input.off('pointermove', scene._currentDragMoveHandler, scene);
  }
  if (scene._currentDragDropHandler) {
    scene.input.off('pointerup', scene._currentDragDropHandler, scene);
  }

  // Also remove legacy handlers if they exist (for backward compatibility)
  if (scene._dragMoveHandler) {
    scene.input.off('pointermove', scene._dragMoveHandler, scene);
  }
  if (scene._dragDropHandler) {
    scene.input.off('pointerup', scene._dragDropHandler, scene);
  }

  scene.dragTowerType = null;
  scene.dragTowerPrice = null;
  scene.dragTowerRange = null;
}

/**
 * Display range circle for a placed tower
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @param {number} range - Range radius
 * @returns {Phaser.GameObjects.Graphics} The range circle graphics object
 */
export function showRangeCircle(scene, x, y, range) {
  // Extra guard: never show range circle for BirdTower
  // Try to infer if this is a BirdTower by checking for a selected tower or upgrade context
  let isBird = false;
  if (scene.selectedTowerForUpgradeUI && scene.selectedTowerForUpgradeUI.towerType) {
    isBird = String(scene.selectedTowerForUpgradeUI.towerType).toLowerCase() === 'bird';
  }
  // Also check for drag context
  if (scene.dragTowerType && String(scene.dragTowerType).toLowerCase() === 'bird') {
    isBird = true;
  }
  if (isBird) {
    // If BirdTower, do not show range circle
    if (scene.activeTowerRangeCircle) {
      scene.activeTowerRangeCircle.destroy();
      scene.activeTowerRangeCircle = null;
    }
    return null;
  }
  // Destroy any existing active range circle
  if (scene.activeTowerRangeCircle) {
    scene.activeTowerRangeCircle.destroy();
  }

  const circle = scene.add.graphics();
  circle.fillStyle(0x00ff00, 0.18); // Green fill, semi-transparent (matches drag color)
  circle.fillCircle(x, y, range);
  circle.setDepth(20000); // Very high depth to appear above other elements

  scene.activeTowerRangeCircle = circle;
  return circle;
}

/**
 * Hide the active range circle
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function hideRangeCircle(scene) {
  if (scene.activeTowerRangeCircle) {
    scene.activeTowerRangeCircle.destroy();
    scene.activeTowerRangeCircle = null;
  }
}
