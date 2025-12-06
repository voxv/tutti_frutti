/**
 * QUICK START: Adding a New Tower
 * ================================
 */

/*
STEP 1: Define tower in tower.json
-----------------------------------

{
  "newTower": {
    "displayName": "New Tower",
    "description": "Tower description",
    "type": "projectile",              // or "melee" or "aoe"
    "class": "NewTowerClass",          // Must match class name
    "towerType": "new_tower",          // Internal ID
    "cost": 300,
    "range": 300,
    "fireRate": 2.0,
    "damage": 500,
    "assets": {
      "shopImage": "/towers/new_tower_shop.png",
      "placedImage": "/towers/new_tower.png"
    },
    "upgrades": {
      "lower": [{ "name": "Upgrade 1", "cost": 200 }],
      "medium": [{ "name": "Upgrade 2", "cost": 300 }],
      "high": [{ "name": "Upgrade 3", "cost": 400 }]
    }
  }
}


STEP 2: Create tower class
--------------------------

// File: src/game/towers/NewTowerClass.js
import { ProjectileTower } from "./ProjectileTower.js";

export class NewTowerClass extends ProjectileTower {
  constructor(options) {
    super(options);
    this.type = 'new_tower';
    // ... your implementation
  }

  static placeOnScene(scene, x, y) {
    const tower = new NewTowerClass({ position: { x, y } });
    // Setup sprite, set properties, return
    return tower;
  }
}


STEP 3: Register in towerFactory.js
-----------------------------------

// Update TOWER_CLASS_MAP:
const TOWER_CLASS_MAP = {
  'NewTowerClass': 'NewTowerClass',  // ADD THIS LINE
  'KnifeTower': 'KnifeTower',
  'CannonTower': 'CannonTower',
  // ...
};


STEP 4: Done!
-------------

The tower is now:
✓ Available in the shop
✓ Purchasable and placeable
✓ All stats active
✓ Upgrades available
✓ Grid auto-resizes


FACTORY FUNCTIONS:
==================

getAvailableTowers(config)           // Returns all towers sorted by cost
getTowerConfig(config, towerKey)     // Get config for a tower
getTowerShopInfo(config, towerKey)   // Get shop display info
createTowerInstance(scene, x, y, towerKey, config)  // Create tower instance
loadTowerAssets(scene, config)       // Load all assets
setupTowerAnimations(scene, config)  // Create all animations


ASSET REQUIREMENTS:
===================

For each tower you need:
- /towers/{tower}_shop.png          - Shop display image
- /towers/{tower}.png               - Placed tower image (or spritesheet)
- /towers/{tower}_projectile.png    - Projectile image (if projectile type)

For animated towers:
- Add animation config to assets.animation
- Spritesheet at placedImage path
- Frame dimensions must match actual spritesheet


UPGRADES TIER SYSTEM:
====================

"upgrades": {
  "lower": [],    // Basic, 200-300 cost range
  "medium": [],   // Intermediate, 300-400 cost range
  "high": []      // Advanced, 400-500+ cost range
}

Each can have multiple upgrades
Player can buy all from a tier before moving to next


TOWER TYPES:
============

"projectile"  - Shoots projectiles at enemies
"aoe"         - Area of Effect (hits all enemies in range)
"melee"       - Close-range physical attacks


OPTIONAL FIELDS:
================

homing: true            // Projectiles follow targets
animation: { ... }      // For sprite-based animation
projectile: "path"      // For projectile towers
*/
