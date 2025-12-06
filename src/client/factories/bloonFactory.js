/**
 * Bloon Factory Module
 * Creates bloon instances from configuration
 * Handles bloon spawning hierarchy (which bloon spawns which children)
 */

/**
 * Cache for already-imported bloon classes
 */
const bloonClassCache = {};

/**
 * Get bloon configuration by key
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {string} bloonKey - The bloon key (e.g., 'cherry', 'banana')
 * @returns {Object|null} The bloon configuration or null if not found
 */
export function getBloonConfig(bloonsConfig, bloonKey) {
  if (!bloonsConfig || !bloonsConfig.bloons) {
    console.error('Invalid bloons config structure', bloonsConfig);
    return null;
  }
  const config = bloonsConfig.bloons[bloonKey] || null;
  return config;
}

/**
 * Get all available bloons
 * @param {Object} bloonsConfig - The bloons configuration object
 * @returns {Array} Array of bloon entries [key, config]
 */
export function getAvailableBloons(bloonsConfig) {
  if (!bloonsConfig || !bloonsConfig.bloons) {
    console.error('Invalid bloons config structure');
    return [];
  }
  return Object.entries(bloonsConfig.bloons);
}

/**
 * Get what spawns when a bloon dies
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {string} bloonKey - The bloon key
 * @returns {Array|null} Array of child bloon types, or null if no children
 */
export function getBloonChildren(bloonsConfig, bloonKey) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  if (!config) return null;
  return config.spawnsOnPop || null;
}

/**
 * Get bloon display info
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {string} bloonKey - The bloon key
 * @returns {Object} Bloon display info { name, health, speed, description, spawnsOnPop }
 */
export function getBloonInfo(bloonsConfig, bloonKey) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  if (!config) return null;

  return {
    key: bloonKey,
    name: config.displayName || bloonKey,
    health: config.health,
    speed: config.speed,
    reward: config.reward,
    size: config.size,
    color: config.color,
    description: config.description || '',
    spawnsOnPop: config.spawnsOnPop,
    image: config.image,
    spritesheet: config.spritesheet,
    frameCount: config.frameCount
  };
}

/**
 * Check if a bloon spawns children when popped
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {string} bloonKey - The bloon key
 * @returns {boolean} True if bloon spawns children
 */
export function doesBloonSpawnChildren(bloonsConfig, bloonKey) {
  const children = getBloonChildren(bloonsConfig, bloonKey);
  return children !== null && children.length > 0;
}

/**
 * Dynamically import a bloon class
 * @param {string} className - The class name (e.g., 'CherryBloon')
 * @returns {Promise} Promise that resolves with the imported module
 */
export async function importBloonClass(className) {
  // Check cache first
  if (bloonClassCache[className]) {
    return bloonClassCache[className];
  }

  // Convert class name to file path
  const filePath = `../../game/enemies/${className}.js`;

  try {
    const module = await import(filePath);
    const BloonClass = module[className];
    
    if (!BloonClass) {
      throw new Error(`${className} not found in module ${filePath}`);
    }

    // Cache the import
    bloonClassCache[className] = Promise.resolve({ BloonClass });
    return bloonClassCache[className];
  } catch (error) {
    console.error(`Failed to import bloon class ${className}:`, error);
    throw error;
  }
}

/**
 * Convert bloon key to class name (e.g., 'cherry' -> 'CherryBloon')
 * @param {string} bloonKey - The bloon key
 * @returns {string} The class name
 */
export function getBloonClassName(bloonKey) {
  return bloonKey.charAt(0).toUpperCase() + bloonKey.slice(1) + 'Bloon';
}

/**
 * Create a bloon instance at a given location
 * @param {Object} path - The path configuration
 * @param {string} bloonKey - The bloon key (e.g., 'cherry')
 * @param {Object} bloonsConfig - The bloons configuration object
 * @returns {Promise} Promise that resolves with the bloon instance
 */
export async function createBloonInstance(path, bloonKey, bloonsConfig) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  if (!config) {
    throw new Error(`Bloon configuration not found for key: ${bloonKey}`);
  }

  // Get the class to instantiate
  const className = getBloonClassName(bloonKey);
  const { BloonClass } = await importBloonClass(className);

  // Parse color from hex string to number
  const colorValue = typeof config.color === 'string' 
    ? parseInt(config.color, 16) 
    : config.color;

  const nextTypesValue = config.spawnsOnPop || [];

  // Create the bloon instance with all config data
  const bloonInstance = new BloonClass(path, {
    level: 1,
    nextTypes: nextTypesValue,
    speed: config.speed,
    reward: config.reward,
    color: colorValue,
    size: config.size,
    image: config.image,
    spritesheet: config.spritesheet ? config.image : null,  // Only use image as spritesheet key if spritesheet is true
    frameCount: config.frameCount,
    frameWidth: config.frameWidth,
    frameHeight: config.frameHeight,
    health: config.health,
    damage: config.damage !== undefined ? config.damage : 1
  });

  return bloonInstance;
}

/**
 * Spawn child bloons when parent is popped
 * @param {Object} parentBloon - The parent bloon instance
 * @param {Array<string>} childTypes - Array of child bloon types to spawn
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {Object} gameLogic - The game logic instance
 * @returns {Promise} Promise that resolves when all children are created
 */
export async function spawnChildBloons(parentBloon, childTypes, bloonsConfig, gameLogic) {
  if (!childTypes || !Array.isArray(childTypes)) {
    return;
  }

  const childBloons = [];

  for (const childType of childTypes) {
    try {
      const childBloon = await createBloonInstance(parentBloon.path, childType, bloonsConfig);
      // Inherit parent properties
      childBloon.position.x = parentBloon.position.x;
      childBloon.position.y = parentBloon.position.y;
      childBloon.progress = parentBloon.progress;
      childBloon.distanceTraveled = parentBloon.distanceTraveled;
      childBloon.spawnDelay = parentBloon.spawnDelay;
      childBloon.spawnTimer = parentBloon.spawnTimer;
      childBloon.started = parentBloon.started;
      // If parent was destroyed by laser, set cooldown on child (short cooldown to prevent instant hit)
      if (parentBloon._laserDestroyed) {
        let cooldown = 2000;
        // Use upgrades from the tower if present, else from parentBloon
        const upgrades = parentBloon._laserTowerUpgrades || parentBloon.upgrades;
        // If penetration or penetration_2, allow instant pop
        if (Array.isArray(upgrades) && (upgrades.includes('penetration') || upgrades.includes('penetration_2'))) {
          cooldown = 0;
        } else if (Array.isArray(upgrades)) {
          if (upgrades.includes('attack_speed_1')) {
            cooldown = 0;
          } else if (upgrades.includes('attack_speed')) {
            cooldown -= 500;
          }
        }
        childBloon._laserSpawnCooldownUntil = performance.now() + cooldown;
      }
      // Pass recursive destruction flag to child so chain continues
      // Track depth: if parent was destroyed recursively, increment depth counter
      if (parentBloon._destroyedBySharperBlade || parentBloon.maxBloonsPerAttack >= 2) {
        const parentDepth = parentBloon._chainDepth || 0;
        // Only continue chain if depth is less than 2 (to destroy 2 layers: banana->orange->apple)
        if (parentDepth < 2) {
          childBloon._destroyedBySharperBlade = true;
          childBloon._chainDepth = parentDepth + 1;

        }
      }
      childBloons.push(childBloon);
    } catch (error) {
      console.error(`Failed to create child bloon of type ${childType}:`, error);
    }
  }

  // Add all child bloons to the game
  if (gameLogic && gameLogic.enemies) {
    gameLogic.enemies.push(...childBloons);
    // If parent was destroyed by sharper_blade, storm_spin, or blade_master, destroy the first child recursively
    if ((parentBloon._destroyedBySharperBlade || parentBloon.maxBloonsPerAttack >= 2) && childBloons.length > 0) {
      setTimeout(() => {
        // Check if the first child is flagged for recursive destruction (depth check)
        if (childBloons[0]._destroyedBySharperBlade && typeof childBloons[0].takeDamage === 'function') {

          childBloons[0].takeDamage('SHARPER_BLADE_CHAIN');
        }
      }, 50);
    }
  }

  return childBloons;
}

/**
 * Get bloon spawn chain (recursively show what spawns from a bloon)
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {string} bloonKey - The bloon key to start from
 * @param {number} depth - Maximum depth to traverse (default 5)
 * @param {number} currentDepth - Current recursion depth
 * @returns {Object} Spawn chain hierarchy
 */
export function getBloonSpawnChain(bloonsConfig, bloonKey, depth = 5, currentDepth = 0) {
  if (currentDepth >= depth) {
    return null;
  }

  const config = getBloonConfig(bloonsConfig, bloonKey);
  if (!config) {
    return null;
  }

  const chain = {
    key: bloonKey,
    name: config.displayName,
    health: config.health,
    reward: config.reward,
    children: null
  };

  if (config.spawnsOnPop && config.spawnsOnPop.length > 0) {
    chain.children = config.spawnsOnPop.map(childKey => 
      getBloonSpawnChain(bloonsConfig, childKey, depth, currentDepth + 1)
    );
  }

  return chain;
}

/**
 * Calculate total reward from a bloon and all its children (recursive)
 * @param {Object} bloonsConfig - The bloons configuration object
 * @param {string} bloonKey - The bloon key
 * @returns {number} Total reward value
 */
export function calculateTotalBloonReward(bloonsConfig, bloonKey) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  if (!config) return 0;

  let totalReward = config.reward || 0;

  // Add rewards from all children
  if (config.spawnsOnPop && config.spawnsOnPop.length > 0) {
    for (const childKey of config.spawnsOnPop) {
      totalReward += calculateTotalBloonReward(bloonsConfig, childKey);
    }
  }

  return totalReward;
}

/**
 * Validate bloon configuration
 * Checks for circular references and missing bloon types
 * @param {Object} bloonsConfig - The bloons configuration object
 * @returns {Object} Validation result { valid: boolean, errors: Array<string> }
 */
export function validateBloonsConfig(bloonsConfig) {
  const errors = [];
  const visited = new Set();

  function checkForCycles(bloonKey, path = []) {
    if (visited.has(bloonKey)) {
      return; // Already validated this path
    }

    if (path.includes(bloonKey)) {
      errors.push(`Circular reference detected: ${[...path, bloonKey].join(' -> ')}`);
      return;
    }

    const config = getBloonConfig(bloonsConfig, bloonKey);
    if (!config) {
      errors.push(`Missing bloon configuration for: ${bloonKey}`);
      return;
    }

    if (config.spawnsOnPop) {
      for (const childKey of config.spawnsOnPop) {
        checkForCycles(childKey, [...path, bloonKey]);
      }
    }

    visited.add(bloonKey);
  }

  // Check all bloons
  if (bloonsConfig && bloonsConfig.bloons) {
    for (const bloonKey of Object.keys(bloonsConfig.bloons)) {
      checkForCycles(bloonKey);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
