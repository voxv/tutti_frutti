/**
 * ENHANCED TOWER.JSON STRUCTURE
 * 
 * The tower.json file now contains complete tower definitions that enable:
 * 1. Automatic shop UI generation (dynamically sized grid)
 * 2. Automatic asset loading during preload
 * 3. Automatic animation setup during scene creation
 * 4. Automatic tower instantiation with proper class loading
 * 5. Adding new towers requires ONLY updating this JSON file + creating tower class
 * 
 * COMPLETE FIELD REFERENCE:
 * ========================
 * 
 * Root level (each tower key like "knife", "cannon", "laser", etc):
 * 
 *   displayName (string): Tower name for UI display
 *   description (string): Short description shown in tooltips
 *   type (string): Tower type - "melee", "projectile", or "aoe"
 *   class (string): JavaScript class name for this tower
 *   towerType (string): Internal identifier (used in code like "knife_tower")
 *   cost (number): Gold cost to purchase
 *   range (number): Attack range in pixels
 *   fireRate (number): Shots/attacks per second
 *   damage (number): Damage dealt per attack
 *   homing (boolean, optional): If true, projectiles follow targets
 * 
 *   assets (object): All asset files for this tower
 *     shopImage (string): Path to image shown in shop (/towers/*.png)
 *     placedImage (string): Path to image shown when placed on map
 *     projectile (string, optional): Path to projectile sprite (for projectile towers)
 *     animation (object, optional): Animation definition for placed tower
 *       key (string): Animation ID (used in tower class)
 *       frameWidth (number): Width of each animation frame
 *       frameHeight (number): Height of each animation frame
 *       frames (object): Frame range
 *         start (number): First frame index
 *         end (number): Last frame index
 *       frameRate (number): Frames per second
 *       repeat (number): -1 for loop, 0 for one-time, or number of repeats
 * 
 *   upgrades (object): Upgrade paths organized by tier
 *     lower (array): Basic upgrades
 *       [{ name, cost }, ...]
 *     medium (array): Intermediate upgrades
 *       [{ name, cost }, ...]
 *     high (array): Advanced upgrades
 *       [{ name, cost }, ...]
 * 
 * WORKFLOW FOR ADDING NEW TOWERS:
 * ================================
 * 
 * To add a new tower (e.g., "laser"):
 * 
 * 1. Add tower config to tower.json:
 *    "laser": { 
 *      displayName: "...",
 *      class: "LaserTower",
 *      cost: 400,
 *      assets: { ... },
 *      ...
 *    }
 * 
 * 2. Create src/game/towers/LaserTower.js with:
 *    - LaserTower class extending Tower/AOETower/ProjectileTower
 *    - Static placeOnScene(scene, x, y) method
 * 
 * 3. Update TOWER_CLASS_MAP in towerFactory.js:
 *    'LaserTower': 'LaserTower'
 * 
 * 4. Ensure assets exist in public/towers/
 * 
 * 5. Tower appears automatically in shop!
 * 
 * INTEGRATION POINTS:
 * ===================
 * 
 * towerFactory.js:
 *   - getAvailableTowers(): Returns all towers sorted by cost
 *   - getTowerConfig(): Get config for a specific tower
 *   - getTowerShopInfo(): Get shop display info
 *   - loadTowerAssets(): Automatically loads all tower assets
 *   - setupTowerAnimations(): Creates all animations
 *   - createTowerInstance(): Instantiate tower from config
 * 
 * dynamicShopUI.js:
 *   - drawDynamicShopUI(): Renders shop with all towers from config
 *   - refreshDynamicShopAvailability(): Updates affordability display
 * 
 * Assets are loaded/created in:
 *   - preload: All images via loadTowerAssets()
 *   - create: All animations via setupTowerAnimations()
 * 
 * EXAMPLE CONFIGURATION:
 * =====================
 * 
 * "dart": {
 *   "displayName": "Dart Monkey",
 *   "description": "Shoots darts at enemies",
 *   "type": "projectile",
 *   "class": "DartMonkeyTower",
 *   "towerType": "dart",
 *   "cost": 150,
 *   "range": 300,
 *   "fireRate": 4.0,
 *   "damage": 250,
 *   "assets": {
 *     "shopImage": "/towers/dart_monkey_shop.png",
 *     "placedImage": "/towers/dart_monkey.png",
 *     "projectile": "/towers/dart.png"
 *   },
 *   "upgrades": {
 *     "lower": [
 *       { "name": "Sharper Darts", "cost": 200 },
 *       { "name": "More Darts", "cost": 200 }
 *     ],
 *     "medium": [
 *       { "name": "Dart Storm", "cost": 350 }
 *     ],
 *     "high": [
 *       { "name": "Dart Master", "cost": 500 }
 *     ]
 *   }
 * }
 */
