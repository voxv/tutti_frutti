#!/usr/bin/env node

/**
 * TOWER CONFIGURATION GUIDE
 * =============================
 * 
 * This guide explains how to add a new tower to the game by updating tower.json
 * 
 * STRUCTURE:
 * The tower.json file contains a configuration object where each key represents a tower type.
 * When you add a new tower entry, it automatically:
 * 1. Appears in the shop UI (dynamically arranged in a 2-column grid)
 * 2. Gets loaded with all required assets
 * 3. Can be placed on the game board
 * 4. Gains its defined upgrades in the upgrade panel
 * 
 * ADDING A NEW TOWER - STEP BY STEP:
 * ===================================
 * 
 * Step 1: Create the Tower Class
 *   - Create a new file: src/game/towers/YourTowerName.js
 *   - Extend from Tower, AOETower, or ProjectileTower
 *   - Implement placeOnScene(scene, x, y) static method
 *   
 *   Example:
 *   ```
 *   export class LaserTower extends AOETower {
 *     // implementation
 *     static placeOnScene(scene, x, y) {
 *       const tower = new LaserTower({ position: { x, y } });
 *       // ... setup sprite and animations
 *       return tower;
 *     }
 *   }
 *   ```
 * 
 * Step 2: Add Entry to tower.json
 *   ```json
 *   "laser": {
 *     "displayName": "Laser Tower",
 *     "description": "High-powered laser beam tower",
 *     "type": "aoe",
 *     "class": "LaserTower",
 *     "towerType": "laser",
 *     "cost": 400,
 *     "range": 250,
 *     "fireRate": 3.0,
 *     "damage": 500,
 *     "assets": {
 *       "shopImage": "/towers/laser_tower_shop.png",
 *       "placedImage": "/towers/laser_tower.png"
 *     },
 *     "upgrades": {
 *       "lower": [
 *         { "name": "Increased Power", "cost": 300 },
 *         { "name": "Wider Beam", "cost": 300 }
 *       ],
 *       "medium": [
 *         { "name": "Double Laser", "cost": 400 }
 *       ],
 *       "high": [
 *         { "name": "Laser Master", "cost": 500 }
 *       ]
 *     }
 *   }
 *   ```
 * 
 * Step 3: Add the Tower Class to Tower Factory
 *   The TOWER_CLASS_MAP in towerFactory.js needs the class name:
 *   ```
 *   const TOWER_CLASS_MAP = {
 *     'LaserTower': 'LaserTower',  // <- Add this line
 *     'KnifeTower': 'KnifeTower',
 *     // ... other towers
 *   };
 *   ```
 * 
 * Step 4: That's it!
 *   The tower will:
 *   - Automatically appear in the shop with the specified cost and display name
 *   - Load the required asset images
 *   - Be purchasable and placeable on the map
 *   - Have access to all defined upgrades
 * 
 * CONFIGURATION FIELDS EXPLAINED:
 * ===============================
 * 
 * Core Fields:
 *   - displayName (string): Name shown in UI and tooltips
 *   - description (string): Short description of tower capabilities
 *   - type (string): "melee", "projectile", or "aoe" - determines tower behavior
 *   - class (string): The JavaScript class name (must match file and TOWER_CLASS_MAP)
 *   - towerType (string): Unique identifier used in code (e.g., "knife_tower")
 * 
 * Game Stats:
 *   - cost (number): Gold price to buy the tower
 *   - range (number): Attack range in pixels
 *   - fireRate (number): Shots per second (or attacks per second for melee)
 *   - damage (number): Damage per shot/attack
 *   - homing (boolean, optional): Whether projectiles home to targets (projectile towers)
 * 
 * Assets:
 *   - shopImage: Path to shop display image
 *   - placedImage: Path to placed tower image (or spritesheet if animated)
 *   - projectile (optional): Path to projectile image (for projectile towers)
 *   - animation (optional): Animation setup for sprite-based towers
 *     - key: Animation ID
 *     - frameWidth: Width of each animation frame
 *     - frameHeight: Height of each animation frame
 *     - frames: { start: number, end: number }
 *     - frameRate: Frames per second
 *     - repeat: -1 for loop, 0 for single play
 * 
 * Upgrades:
 *   Organized in three tiers (lower, medium, high)
 *   Each contains an array of upgrade objects:
 *   - name (string): Upgrade display name
 *   - cost (number): Gold cost to purchase upgrade
 * 
 * EXAMPLE: Adding a "IceTower"
 * ============================
 * 
 * 1. Create src/game/towers/IceTower.js
 * 2. Add to tower.json:
 * {
 *   "ice": {
 *     "displayName": "Ice Tower",
 *     "description": "Slows and damages enemies",
 *     "type": "projectile",
 *     "class": "IceTower",
 *     "towerType": "ice",
 *     "cost": 275,
 *     "range": 400,
 *     "fireRate": 2.0,
 *     "damage": 150,
 *     "assets": {
 *       "shopImage": "/towers/ice_tower_shop.png",
 *       "placedImage": "/towers/ice_tower.png",
 *       "projectile": "/towers/ice_ball.png"
 *     },
 *     "upgrades": {
 *       "lower": [
 *         { "name": "Deeper Freeze", "cost": 300 },
 *         { "name": "Cold Aura", "cost": 300 }
 *       ],
 *       "medium": [
 *         { "name": "Arctic Winds", "cost": 400 }
 *       ],
 *       "high": [
 *         { "name": "Absolute Zero", "cost": 500 }
 *       ]
 *     }
 *   }
 * }
 * 3. Add to TOWER_CLASS_MAP in towerFactory.js:
 *    'IceTower': 'IceTower'
 * 4. Tower appears in shop automatically!
 * 
 * AUTOMATIC FEATURES:
 * ===================
 * When you add a tower to tower.json:
 * 
 * ✓ Shop UI automatically updates and resizes grid
 * ✓ All assets are loaded during scene preload
 * ✓ Animations are created during scene setup
 * ✓ Tower is available for purchase in correct position (sorted by cost)
 * ✓ Upgrade panel shows all defined upgrades
 * ✓ Tower can be dragged and placed on the map
 * ✓ Range display works automatically
 * ✓ All game mechanics apply (targeting, damage, fireRate, etc.)
 * 
 * TROUBLESHOOTING:
 * ================
 * 
 * Tower doesn't appear in shop:
 *   - Check that the tower key is exactly as you want it
 *   - Verify displayName and cost are present
 *   - Ensure assets.shopImage path is correct
 * 
 * Tower can't be placed:
 *   - Check that the "class" field matches your tower class name exactly
 *   - Verify the class is in TOWER_CLASS_MAP in towerFactory.js
 *   - Ensure the class file exists with the correct export name
 * 
 * Assets don't load:
 *   - Verify asset paths in tower.json start with /towers/
 *   - Check that image files exist in public/towers/
 *   - For spritesheets, ensure frameWidth/frameHeight match actual frames
 * 
 * Animation not playing:
 *   - Verify animation.key matches the tower's animation usage
 *   - Check frameWidth/frameHeight match spritesheet dimensions
 *   - Ensure frames.start and frames.end are correct indices
 */

console.log('Tower Configuration Guide loaded. See comments in this file for documentation.');
