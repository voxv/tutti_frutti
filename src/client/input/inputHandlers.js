/**
 * Input Event Handler Module
 * Manages all input events and user interactions for the game scene
 */

import { hideRangeCircle } from "../logic/towerPlacement.js";
import { GAME_PHASES } from "../state/gameStateManager.js";

/**
 * Setup game field click handler to deselect towers
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} gameWidth - Width of game canvas
 * @param {number} shopWidth - Width of shop area
 * @param {number} gameHeight - Height of game canvas
 * @param {number} infoBarHeight - Height of info bar
 */
export function setupGameFieldClickHandler(scene, gameWidth, shopWidth, gameHeight, infoBarHeight) {
  const gameFieldClickZone = scene.add.zone(
    (gameWidth - shopWidth) / 2,
    (gameHeight - infoBarHeight) / 2,
    gameWidth - shopWidth,
    gameHeight - infoBarHeight
  );
  gameFieldClickZone.setInteractive();
  gameFieldClickZone.setDepth(0);
  gameFieldClickZone.on('pointerdown', (pointer) => {
    handleGameFieldClick(scene, pointer);
  });

  return gameFieldClickZone;
}

/**
 * Handle clicks on the game field
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Phaser.Input.Pointer} pointer - The pointer event
 */
function handleGameFieldClick(scene, pointer) {
  // Check if any tower is at this position
  let clickedTower = scene.gameLogic.towers.find(tower => {
    if (!tower._placedSprite) return false;
    const sprite = tower._placedSprite;
    const distance = Phaser.Math.Distance.Between(
      pointer.x, pointer.y,
      sprite.x, sprite.y
    );
    return distance < 40; // Approximate tower click radius
  });

  // Allow clicking near BirdTower's path center (wider area, draw test circle only if pointer is near)
  if (!clickedTower) {
    clickedTower = scene.gameLogic.towers.find(tower => {
      if (tower.towerType === 'bird' && tower._pathCenter) {
        const centerDist = Phaser.Math.Distance.Between(
          pointer.x, pointer.y,
          tower._pathCenter.x, tower._pathCenter.y
        );
        if (centerDist < 95) {
          return true;
        }
      }
      return false;
    });
  }

  if (clickedTower) {
    // Always use the logic tower object for selection
    let logicTower = clickedTower;
    let sprite = logicTower._placedSprite;
    if (!sprite) {
      // Fallback: try to find the placedSprite by position
      sprite = scene.children.list.find(obj => obj && obj.x === logicTower._pathCenter?.x && obj.y === logicTower._pathCenter?.y && obj.towerType === 'bird');
    }
    if (sprite) {
      scene.selectedTowerForUpgradeUI = sprite;
      if (typeof scene.showUpgradeUI === 'function') {
        scene.showUpgradeUI(sprite);
      }
      // Optionally, update targeting buttons if needed
      if (scene.updateTargetingButtons && scene.targetingButtons) {
        scene.updateTargetingButtons(scene.targetingButtons, sprite, scene.gameLogic, scene.AOETower);
      }
      // Always draw the BirdTower selection area (green circle)
      if (logicTower.towerType === 'bird') {
        if (scene._birdSelectCircle) {
          scene._birdSelectCircle.destroy();
        }
        const center = logicTower._pathCenter || (sprite ? { x: sprite.x, y: sprite.y } : null);
        if (center) {
          const graphics = scene.add.graphics();
          graphics.fillStyle(0x00ff00, 0.18); // Green, semi-transparent
          graphics.fillCircle(center.x, center.y, 95);
          graphics.setDepth(30000);
          scene._birdSelectCircle = graphics;
        }
      }
    } else {
      // Fallback: deselect if no sprite found
      deselectTower(scene);
      // Remove the clickable area circle if present
      if (scene._birdSelectCircle) {
        scene._birdSelectCircle.destroy();
        scene._birdSelectCircle = null;
      }
    }
  } else {
    // Only deselect if not clicking on a tower
    deselectTower(scene);
  }
}

/**
 * Deselect the currently selected tower and hide all related UI
 * @param {Phaser.Scene} scene - The Phaser scene
 */
export function deselectTower(scene) {
  hideRangeCircle(scene);
  scene.selectedTowerForUpgradeUI = null;
  
  // Hide targeting buttons and label
  if (scene.targetingButtons) {
    scene.targetingButtons.forEach(btn => btn.setVisible(false));
    if (scene.targetingButtons.targetingLabel) {
      scene.targetingButtons.targetingLabel.setVisible(false);
    }
  }
  
  // Hide upgrade UI
  if (scene.upgradeUI) {
    scene.upgradeUI.setVisible(false);
  }
  // Hide upgrade tooltip if present
  if (scene.upgradeTooltip && scene.upgradeTooltip.setVisible) {
    scene.upgradeTooltip.setVisible(false);
  }
  // Remove BirdTower selection area circle if present
  if (scene._birdSelectCircle) {
    scene._birdSelectCircle.destroy();
    scene._birdSelectCircle = null;
  }
}

/**
 * Setup tower click handler
 * @param {Phaser.Physics.Arcade.Sprite} placedTower - The tower sprite
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Object} gameLogic - Reference to game logic
 * @param {Function} showRangeCircle - Function to show range circle
 * @param {Function} updateTargetingButtons - Function to update targeting buttons
 * @param {Class} AOETower - AOETower class for type checking
 * @param {Object} sceneUtils - Scene utility functions
 */
export function setupTowerClickHandler(
  placedTower,
  scene,
  gameLogic,
  showRangeCircle,
  updateTargetingButtons,
  AOETower,
  sceneUtils
) {
  placedTower.on('pointerdown', () => {
    // Hide any existing range circle
    hideRangeCircle(scene);

    // Find the logic tower to get range using utility function
    const logicTower = sceneUtils.findLogicTowerBySprite(gameLogic, placedTower) || placedTower._parentTower || placedTower;
    // Unify with field click handler: select the logic tower and show all selection UI
    if (logicTower) {
      let sprite = logicTower._placedSprite || placedTower;
      scene.selectedTowerForUpgradeUI = sprite;
      if (typeof scene.showUpgradeUI === 'function') {
        scene.showUpgradeUI(sprite);
      }
      if (scene.updateTargetingButtons && scene.targetingButtons) {
        scene.updateTargetingButtons(scene.targetingButtons, sprite, gameLogic, AOETower);
      }
      // Show range circle for all except BirdTower
      const isBirdTower = logicTower.towerType === 'bird';
      const isSpikeTower = logicTower.towerType === 'spike';
      if (!isBirdTower) {
        // Use logicTower.range if available, else fallback to placedTower.towerRange
        const range = logicTower.range || placedTower.towerRange;
        showRangeCircle(scene, placedTower.x, placedTower.y, range);
      }
      // Draw the clickable area circle for BirdTower selection (filled, green, like other range circles)
      if (isBirdTower) {
        if (scene._birdSelectCircle) {
          scene._birdSelectCircle.destroy();
        }
        const center = logicTower._pathCenter || (logicTower._placedSprite ? { x: logicTower._placedSprite.x, y: logicTower._placedSprite.y } : null);
        if (center) {
          const graphics = scene.add.graphics();
          graphics.fillStyle(0x00ff00, 0.18); // Green, semi-transparent
          graphics.fillCircle(center.x, center.y, 95);
          graphics.setDepth(30000);
          scene._birdSelectCircle = graphics;
        }
      }
    }
  });
}

/**
 * Setup start wave button click handler
 * @param {Phaser.GameObjects.Text} startWaveButton - The button object
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Function} spawnWave - Function to spawn wave
 */
export function setupStartWaveButtonHandler(startWaveButton, scene, spawnWave) {
  startWaveButton.on("pointerdown", () => {
    handleStartWaveClick(scene, spawnWave);
  });
}

/**
 * Handle start wave button click
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Function} spawnWave - Function to spawn wave
 */
function handleStartWaveClick(scene, spawnWave) {
  if (!scene.gameStateMachine.isInPhase(GAME_PHASES.BUYING) || !scene.startWaveButton.input.enabled) return;
  
  // If starting wave 50, play boss music
  if (scene.waveNumber === 50) {
    console.log('[Wave50 Handler] Starting wave 50 - preparing boss music');
    // Stop main game music
    if (scene.sound && scene.sound.getAll) {
      scene.sound.getAll('main_game_music').forEach(snd => snd.stop());
    } else if (scene.sound && scene.sound.get('main_game_music')) {
      scene.sound.get('main_game_music').stop();
    }
    // Stop existing boss music if any
    if (scene.sound && scene.sound.get('boss_music')) {
      console.log('[Wave50 Handler] Stopping existing boss music');
      scene.sound.get('boss_music').stop();
    }
    console.log('[Wave50 Handler] soundOn:', scene.soundOn, 'boss_music exists:', scene.cache.audio.exists('boss_music'));
    if (scene.soundOn !== false && scene.cache.audio.exists('boss_music')) {
      console.log('[Wave50 Handler] Playing boss_music now');
      const bossSound = scene.sound.play('boss_music', { loop: true, volume: 0.8 });
      console.log('[Wave50 Handler] Sound played. isPlaying:', bossSound?.isPlaying);
    } else {
      console.log('[Wave50 Handler] Cannot play: soundOn=', scene.soundOn, 'exists=', scene.cache.audio.exists('boss_music'));
    }
  }
  
  scene.gameStateMachine.transition(GAME_PHASES.SPAWNING);
  scene.startWaveButton.setStyle({ fill: "#888" });
  scene.startWaveButton.disableInteractive();
  // Use modular wave spawning
  spawnWave(scene, scene.gameLogic, scene.currentWaveIndex);
  scene.currentWaveIndex++;
}

/**
 * Setup all input handlers for a scene
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {Object} config - Configuration object with all necessary references
 */
export function setupAllInputHandlers(scene, config) {
  const {
    gameWidth,
    gameHeight,
    shopWidth,
    infoBarHeight,
    gameLogic,
    showRangeCircle,
    updateTargetingButtons,
    AOETower,
    sceneUtils,
    spawnWave
  } = config;

  // Setup game field click handler
  setupGameFieldClickHandler(scene, gameWidth, shopWidth, gameHeight, infoBarHeight);

  // Setup start wave button handler
  if (scene.startWaveButton) {
    setupStartWaveButtonHandler(scene.startWaveButton, scene, spawnWave);
  }
}
