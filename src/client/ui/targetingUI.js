/**
 * Targeting Priority UI Module
 * Handles the creation, styling, and event logic for targeting priority buttons (First, Last, Strong)
 */

/**
 * Creates and manages targeting priority buttons
 * @param {Phaser.Scene} scene - The Phaser scene
 * @param {number} gameHeight - Height of the game canvas
 * @param {number} infoBarHeight - Height of the info bar
 * @param {Object} gameLogic - Reference to the game logic (for tower access)
 * @param {Object} config - Configuration object (AOETower class for type checking)
 * @returns {Array} Array of button objects
 */
export function createTargetingButtons(scene, gameHeight, infoBarHeight, gameLogic, config = {}) {
  const buttons = [];
  const priorities = ["First", "Last", "Strong"];
  const buttonWidth = 70;
  const buttonHeight = 32;
  const buttonSpacing = 10;
  const startX = 30;
  const startY = gameHeight - infoBarHeight / 2;

  // Add a cool "Targeting" label above the buttons
  const targetingLabel = scene.add.text(
    startX + ((priorities.length * (buttonWidth + buttonSpacing) - buttonSpacing) / 2),
    startY - buttonHeight - 12 + 23, // Lowered by 23 pixels total (27-4)
    "Targeting",
    {
      font: "bold 19px Arial Black, Arial, sans-serif",
      fill: "#ffeb3b",
      stroke: "#222",
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, fill: true },
      align: "center"
    }
  ).setOrigin(0.5, 1).setDepth(1005);
  targetingLabel.setVisible(false); // Hide by default, show with buttons
  buttons.targetingLabel = targetingLabel;

  priorities.forEach((priority, i) => {
    const btn = scene.add.text(
      startX + i * (buttonWidth + buttonSpacing),
      startY,
      priority,
      {
        font: "18px Arial",
        fill: "#fff",
        backgroundColor: "#444",
        padding: { x: 12, y: 6 },
        borderRadius: 6
      }
    ).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    btn.setDepth(1004);
    btn.priorityType = priority;
    btn.setVisible(false); // Hide by default

    btn.on('pointerdown', () => {
      // Highlight selected button
      buttons.forEach(b => b.setStyle({ backgroundColor: "#444", fill: "#fff" }));
      btn.setStyle({ backgroundColor: "#00aaff", fill: "#fff" });

      // Set priority on both sprite and logic tower
      if (scene.selectedTowerForUpgradeUI) {
        const sprite = scene.selectedTowerForUpgradeUI;
        const logicTower = gameLogic.towers.find(tower => tower._placedSprite === sprite);
        
        // Set on sprite
        sprite.targetingPriority = priority;
        
        // Set on logic tower
        if (logicTower) {
          logicTower.targetingPriority = priority;
        }
      }
    });

    buttons.push(btn);
  });

  return buttons;
}

/**
 * Updates the visibility and state of targeting buttons based on selected tower
 * @param {Array} buttons - Array of targeting button objects
 * @param {Phaser.Physics.Arcade.Sprite} selectedTower - The selected tower sprite
 * @param {Object} gameLogic - Reference to the game logic
 * @param {Class} AOETower - AOETower class for type checking
 */
export function updateTargetingButtons(buttons, selectedTower, gameLogic, AOETower) {

  if (!buttons || buttons.length === 0) return;

  // Find the logic tower object
  const logicTower = gameLogic.towers.find(tower => tower._placedSprite === selectedTower);
  const isAOE = AOETower && typeof AOETower === 'function' ? logicTower instanceof AOETower : false;
  const isLaser = logicTower && logicTower.constructor && logicTower.constructor.name === 'LaserTower';
  const isSpike = logicTower && logicTower.constructor && logicTower.constructor.name === 'SpikeTower';
  const isClumpSpike = logicTower && logicTower.towerType === 'clumpspike';
  const isBombTrap = logicTower && logicTower.towerType === 'bomb_trap';

  // Hide targeting for clumpspike and bomb_trap
  if (isClumpSpike || isBombTrap) {
    buttons.forEach(btn => btn.setVisible(false));
    if (buttons.targetingLabel) buttons.targetingLabel.setVisible(false);
    return;
  }

  // Show/hide the Targeting label if present
  if (buttons.targetingLabel) {
    buttons.targetingLabel.setVisible(!(isAOE || isLaser || isSpike));
  }

  if (isAOE || isLaser || isSpike) {
    // Hide buttons for AOE towers, LaserTower, and SpikeTower
    buttons.forEach(btn => btn.setVisible(false));
    return;
  }

  // Show buttons for non-AOE towers
  buttons.forEach(btn => btn.setVisible(true));

  // Get current targeting priority from logic tower first, then sprite, default to 'First'
  let currentPriority = 'First';
  
  if (logicTower && (logicTower.targetingPriority !== undefined && logicTower.targetingPriority !== null)) {
    currentPriority = logicTower.targetingPriority;
  } else if (selectedTower && (selectedTower.targetingPriority !== undefined && selectedTower.targetingPriority !== null)) {
    currentPriority = selectedTower.targetingPriority;
  }

  // Update button styles to reflect current priority
  buttons.forEach(btn => {
    if (currentPriority === btn.priorityType) {
      btn.setStyle({ backgroundColor: "#00aaff", fill: "#fff" });
    } else {
      btn.setStyle({ backgroundColor: "#444", fill: "#fff" });
    }
  });
}

/**
 * Hides all targeting buttons
 * @param {Array} buttons - Array of targeting button objects
 */
export function hideTargetingButtons(buttons) {
  if (!buttons || buttons.length === 0) return;
  buttons.forEach(btn => btn.setVisible(false));
  if (buttons.targetingLabel) {
    buttons.targetingLabel.setVisible(false);
  }
}

/**
 * Shows all targeting buttons
 * @param {Array} buttons - Array of targeting button objects
 */
export function showTargetingButtons(buttons) {
  if (!buttons || buttons.length === 0) return;
  buttons.forEach(btn => btn.setVisible(true));
}
