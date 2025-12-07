/**
 * Tower Factory Module
 * Automatically creates tower instances and UI based on tower.json config
 * New towers can be added to the config and will automatically appear in the shop
 */

import { importTowerClassFromRegistry } from '../../game/towers/towerRegistry.js';

/**
 * Mapping from tower type to class name for dynamic imports
 */
const TOWER_CLASS_MAP = {
  'LaserTower': 'LaserTower',
  'GlacialTower': 'GlacialTower',
  'KnifeTower': 'KnifeTower',
  'CannonTower': 'CannonTower',
  'AOETower': 'AOETower',
  'ProjectileTower': 'ProjectileTower'
};

/**
 * Cache for already-imported tower classes
 */
const importCache = {};

/**
 * Get all available towers from config sorted by cost
 * @param {Object} towerConfig - The tower configuration object
 * @returns {Array} Array of tower entries [key, config] sorted by cost
 */
export function getAvailableTowers(towerConfig) {
  return Object.entries(towerConfig)
    .sort((a, b) => a[1].cost - b[1].cost);
}

/**
 * Get tower config by key
 * @param {Object} towerConfig - The tower configuration object
 * @param {string} towerKey - The tower key (e.g., 'knife', 'cannon')
 * @returns {Object|null} The tower configuration or null if not found
 */
export function getTowerConfig(towerConfig, towerKey) {
  return towerConfig[towerKey] || null;
}

/**
 * Get tower shop display info
 * @param {Object} towerConfig - The tower configuration object
 * @param {string} towerKey - The tower key
 * @returns {Object} Shop display info { name, cost, image, description }
 */
export function getTowerShopInfo(towerConfig, towerKey) {
  const config = getTowerConfig(towerConfig, towerKey);
  if (!config) return null;

  return {
    key: towerKey,
    name: config.displayName || towerKey,
    description: config.description || '',
    cost: config.cost,
    image: config.assets?.shopImage || config.assets?.placedImage,
    range: config.range,
    type: config.type
  };
}

/**
 * Load all required tower assets for the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Object} towerConfig - The tower configuration object
 */
export function loadTowerAssets(scene, towerConfig) {
  Object.entries(towerConfig).forEach(([key, config]) => {
    // Load shop image
    if (config.assets?.shopImage && !scene.textures.exists(config.assets.shopImage)) {
      scene.load.image(`${key}_shop`, config.assets.shopImage);
    }

    // Load placed image
    if (config.assets?.placedImage && !scene.textures.exists(config.assets.placedImage)) {
      const isAnimation = config.assets.animation;
      if (isAnimation && config.assets.animation.frameWidth) {
        // Load as spritesheet for animation
        scene.load.spritesheet(
          `${key}_placed`,
          config.assets.placedImage,
          {
            frameWidth: config.assets.animation.frameWidth,
            frameHeight: config.assets.animation.frameHeight
          }
        );
      } else {
        // Load as regular image
        scene.load.image(`${key}_placed`, config.assets.placedImage);
      }
    }

    // Load projectile image if it exists
    if (config.assets?.projectile && !scene.textures.exists(config.assets.projectile)) {
      scene.load.image(`${key}_projectile`, config.assets.projectile);
    }
  });
}

/**
 * Setup animations for all towers
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Object} towerConfig - The tower configuration object
 */
export function setupTowerAnimations(scene, towerConfig) {
  Object.entries(towerConfig).forEach(([key, config]) => {
    if (config.assets?.animation) {
      const anim = config.assets.animation;
      if (!scene.anims.exists(anim.key)) {
        scene.anims.create({
          key: anim.key,
          frames: scene.anims.generateFrameNumbers(`${key}_placed`, {
            start: anim.frames.start,
            end: anim.frames.end
          }),
          frameRate: anim.frameRate,
          repeat: anim.repeat
        });
      }
    }
  });
}

/**
 * Dynamically import a tower class
 * @param {string} className - The class name (e.g., 'KnifeTower')
 * @returns {Promise} Promise that resolves with the imported module
 */
export async function importTowerClass(className) {
  // Check cache first
  if (importCache[className]) {
    return importCache[className];
  }

  try {
    // Use registry instead of dynamic import for Vite compatibility
    const result = await importTowerClassFromRegistry(className);
    
    // Cache the import
    importCache[className] = Promise.resolve(result);
    return importCache[className];
  } catch (error) {
    console.error(`Failed to import tower class ${className}:`, error);
    throw error;
  }
}

/**
 * Create a tower instance at a given location
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} towerKey - The tower key (e.g., 'knife')
 * @param {Object} towerConfig - The tower configuration object
 * @returns {Promise} Promise that resolves with the tower instance
 */
export async function createTowerInstance(scene, x, y, towerKey, towerConfig) {
  const config = getTowerConfig(towerConfig, towerKey);
  if (!config) {
    throw new Error(`Tower configuration not found for key: ${towerKey}`);
  }

  // Get the class to instantiate
  const { TowerClass } = await importTowerClass(config.class);

  // Create the tower using the class's placeOnScene method
  const towerInstance = TowerClass.placeOnScene(scene, x, y);

  return towerInstance;
}

/**
 * Get tower info by towerType string
 * @param {Object} towerConfig - The tower configuration object
 * @param {string} towerType - The tower type string (e.g., 'knife_tower')
 * @returns {Object|null} The tower config entry [key, config] or null
 */
export function getTowerByTowerType(towerConfig, towerType) {
  for (const [key, config] of Object.entries(towerConfig)) {
    if (config.towerType === towerType) {
      return [key, config];
    }
  }
  return null;
}
