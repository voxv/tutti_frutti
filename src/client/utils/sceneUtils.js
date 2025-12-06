/**
 * Remove all fruit sprites/images from the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function removeFruitSprites(scene) {
  if (!scene || !scene.children) return;
  // Dynamically collect all fruit image keys from window.bloonsConfig if available
  let fruitKeys = ['fruit'];
  if (typeof window !== 'undefined' && window.bloonsConfig && window.bloonsConfig.bloons) {
    fruitKeys = fruitKeys.concat(
      Object.values(window.bloonsConfig.bloons)
        .map(b => b.image)
        .filter(Boolean)
    );
  }
  scene.children.list
    .filter(child => child.texture && typeof child.texture.key === 'string' && fruitKeys.some(fk => child.texture.key === fk || child.texture.key.includes(fk)))
    .forEach(child => { if (child.destroy) child.destroy(); });
}
/**
 * Scene Utility Functions Module
 * Common utilities for scene operations like finding game objects, tower management, etc.
 */

/**
 * Find the logic tower object that corresponds to a placed sprite
 * @param {Object} gameLogic - The game logic object containing towers array
 * @param {Phaser.Physics.Arcade.Sprite} sprite - The placed tower sprite
 * @returns {Object|undefined} The logic tower object or undefined if not found
 */
export function findLogicTowerBySprite(gameLogic, sprite) {
  if (!gameLogic || !gameLogic.towers) return undefined;
  return gameLogic.towers.find(tower => tower._placedSprite === sprite);
}

/**
 * Find a placed tower sprite by its logic tower object
 * @param {Object} gameLogic - The game logic object containing towers array
 * @param {Object} logicTower - The logic tower object
 * @returns {Phaser.Physics.Arcade.Sprite|undefined} The sprite or undefined if not found
 */
export function findSpriteByLogicTower(gameLogic, logicTower) {
  if (!gameLogic || !gameLogic.towers) return undefined;
  const tower = gameLogic.towers.find(t => t === logicTower);
  return tower ? tower._placedSprite : undefined;
}

/**
 * Get tower range, with fallback to default
 * @param {Object} logicTower - The logic tower object
 * @param {Phaser.Physics.Arcade.Sprite} sprite - The tower sprite
 * @param {number} defaultRange - Default range if not found (default: 100)
 * @returns {number} The tower range
 */
export function getTowerRange(logicTower, sprite, defaultRange = 100) {
  if (logicTower && logicTower.range) {
    return logicTower.range;
  }
  if (sprite && sprite.towerRange) {
    return sprite.towerRange;
  }
  return defaultRange;
}

/**
 * Deduct gold from the scene and update UI
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} amount - Amount of gold to deduct
 */
export function deductGold(scene, amount) {
  scene.goldAmount -= amount;
  if (scene.goldText) {
    scene.goldText.setText(String(scene.goldAmount));
  }
}

/**
 * Find tower images in scene children by texture keys
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {string[]} textureKeys - Array of texture keys to search for
 * @param {number} depth - Optional: specific depth to filter by
 * @returns {Phaser.GameObjects.Image[]} Array of matching image objects
 */
export function findTowerImagesByTexture(scene, textureKeys, depth = null) {
  if (!scene || !scene.children) return [];
  
  return scene.children.list.filter(child => {
    if (!child.texture) return false;
    const hasTexture = textureKeys.includes(child.texture.key);
    if (depth !== null) {
      return hasTexture && child.depth === depth;
    }
    return hasTexture;
  });
}

/**
 * Remove all placed tower sprites from the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function removePlacedTowerSprites(scene, gameLogic = null) {
  // Only remove sprites at depth 1001 (placed towers) to avoid accidentally removing shop images at depth 100
  const spritesToDestroy = [];
  
  if (scene && scene.children && scene.children.list) {
    for (const child of scene.children.list) {
      // Only target placed tower sprites at depth 1001
      if (child.depth === 1001) {
        spritesToDestroy.push(child);
      }
    }
    
    // Now destroy all collected sprites
    spritesToDestroy.forEach(child => {
      if (child.destroy) child.destroy();
    });
  }
  
  // Also destroy _placedSprite on all logic towers if provided
  if (gameLogic && Array.isArray(gameLogic.towers)) {
    for (const tower of gameLogic.towers) {
      if (tower && tower._placedSprite && typeof tower._placedSprite.destroy === 'function') {
        tower._placedSprite.destroy();
        tower._placedSprite = null;
      }
    }
  }
}

/**
 * Remove all projectiles and spike sprites from the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function removeAllProjectiles(scene) {
  const spritesToDestroy = [];
  if (scene && scene.children && scene.children.list) {
    for (const child of scene.children.list) {
      // Remove all sprites that are projectiles (depth 1000) or have a texture key containing 'projectile' or 'glue_projectile'
      if (
        child.depth === 1000 ||
        (child.texture && typeof child.texture.key === 'string' &&
          (child.texture.key.includes('projectile') || child.texture.key.includes('glue_projectile')))
      ) {
        spritesToDestroy.push(child);
      }
    }
  }
  spritesToDestroy.forEach(child => {
    if (child.destroy) child.destroy();
  });
}

/**
 * Show all placed tower sprites in the scene
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function showPlacedTowerSprites(scene) {
  const towerImages = findTowerImagesByTexture(
    scene,
    ['knife_tower', 'cannon', 'tower_1'],
    1001
  );
  towerImages.forEach(img => img.setVisible(true));
}

/**
 * Reset game logic state (towers, enemies, projectiles, etc.)
 * @param {Object} gameLogic - The game logic object
 */
export function resetGameLogicState(gameLogic) {
  if (!gameLogic) return;

  gameLogic.enemies = [];
  gameLogic.towers = [];
  gameLogic.projectiles = [];
  gameLogic.waveSpawningComplete = false;
  gameLogic.enemiesRemovedCount = 0;
  gameLogic.totalBloonsScheduled = 0;

  // Clear any pending wave spawn timeouts
  if (typeof gameLogic._waveTimeouts === 'object' && Array.isArray(gameLogic._waveTimeouts)) {
    gameLogic._waveTimeouts.forEach(tid => clearTimeout(tid));
    gameLogic._waveTimeouts = [];
  }
}

/**
 * Reset scene UI elements (wave text, start button, etc.)
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function resetSceneUIElements(scene) {
  if (scene.waveText) {
    scene.waveText.setText(`Wave: ${scene.waveNumber}`);
  }
  if (scene.startWaveButton) {
    scene.startWaveButton.setStyle({ fill: "#00ff00" });
    scene.startWaveButton.setInteractive({ useHandCursor: true });
    scene.startWaveButton.input.enabled = true;
  }
}

/**
 * Initialize targeting priority if not already set
 * @param {Phaser.Physics.Arcade.Sprite} sprite - The tower sprite
 * @param {string} defaultPriority - Default priority (default: 'First')
 */
export function initializeTowerTargetingPriority(sprite, defaultPriority = 'First') {
  if (sprite.targetingPriority === undefined || sprite.targetingPriority === null) {
    sprite.targetingPriority = defaultPriority;
  }
}

/**
 * Get current tower targeting priority with fallback
 * @param {Phaser.Physics.Arcade.Sprite} sprite - The tower sprite
 * @param {string} defaultPriority - Default priority if not set (default: 'First')
 * @returns {string} The targeting priority
 */
export function getTowerTargetingPriority(sprite, defaultPriority = 'First') {
  if (sprite.targetingPriority === undefined || sprite.targetingPriority === null) {
    return defaultPriority;
  }
  return sprite.targetingPriority;
}

/**
 * Set tower targeting priority on both sprite and logic tower
 * @param {Phaser.Physics.Arcade.Sprite} sprite - The tower sprite
 * @param {Object} logicTower - The logic tower object
 * @param {string} priority - The priority to set
 */
export function setTowerTargetingPriority(sprite, logicTower, priority) {
  if (sprite) {
    sprite.targetingPriority = priority;
  }
  if (logicTower) {
    logicTower.targetingPriority = priority;
  }
}
