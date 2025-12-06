/**
 * BLOON CONFIGURATION AND CLASS INTEGRATION GUIDE
 * ================================================
 * 
 * This document explains how bloons.json configuration integrates with individual bloon classes
 * 
 * 
 * THE WORKFLOW:
 * =============
 * 
 * 1. Configuration (bloons.json)
 *    Defines what each bloon SHOULD be:
 *    - Stats (health, speed, reward, size)
 *    - Appearance (color, size)
 *    - Behavior (what spawns on pop)
 *    - Assets (spritesheet, frameCount)
 * 
 * 2. Class Implementation (e.g., CherryBloon.js)
 *    Implements the bloon with specific behavior:
 *    - Extends Bloon base class
 *    - Sets initial stats via super() call
 *    - Can have custom logic
 * 
 * 3. Factory (bloonFactory.js)
 *    Creates instances from config:
 *    - Reads bloons.json
 *    - Imports correct class (CherryBloon, KiwiBloon, etc)
 *    - Instantiates with config values
 *    - Handles child spawning
 * 
 * 
 * CURRENT ARCHITECTURE:
 * ====================
 * 
 * CherryBloon.js (HARDCODED STATS):
 * 
 *   export class CherryBloon extends Bloon {
 *     constructor(pathConfig) {
 *       super(pathConfig, {
 *         level: 1,
 *         nextType: null,              ← Hardcoded!
 *         speed: 100,                  ← Hardcoded!
 *         reward: 120,                 ← Hardcoded!
 *         color: 0x0000ff,             ← Hardcoded!
 *         size: 50,
 *         spritesheet: 'cherries_anim',
 *         frameCount: 3
 *       });
 *     }
 *   }
 * 
 * The problem: Stats are hardcoded in the class. To change a bloon's health or speed,
 * you must edit the class file. This makes it hard to balance and experiment.
 * 
 * 
 * NEW ARCHITECTURE WITH CONFIG:
 * =============================
 * 
 * bloons.json (CENTRALIZED STATS):
 * 
 *   "cherry": {
 *     "speed": 100,
 *     "reward": 120,
 *     "health": 1,
 *     "color": "0xff69b4",
 *     "spawnsOnPop": null,
 *     ...
 *   }
 * 
 * Benefit: All stats in ONE place. Change config, stats change everywhere.
 * 
 * 
 * THREE INTEGRATION APPROACHES:
 * ============================
 * 
 * 
 * APPROACH 1: CONFIG AS SINGLE SOURCE OF TRUTH (RECOMMENDED)
 * ──────────────────────────────────────────────────────────
 * 
 * Classes become minimal, config defines everything:
 * 
 *   // CherryBloon.js (MINIMAL)
 *   export class CherryBloon extends Bloon {
 *     constructor(pathConfig, configData = {}) {
 *       super(pathConfig, configData);
 *     }
 *   }
 * 
 *   // bloonFactory.js creates like this:
 *   const config = getBloonConfig(bloonsConfig, 'cherry');
 *   const cherryBloon = new CherryBloon(pathConfig, {
 *     speed: config.speed,
 *     reward: config.reward,
 *     health: config.health,
 *     color: config.color,
 *     spritesheet: config.spritesheet,
 *     frameCount: config.frameCount,
 *     // IMPORTANT: Set nextType based on config's spawnsOnPop
 *     nextType: config.spawnsOnPop && config.spawnsOnPop.length > 0 
 *       ? config.spawnsOnPop[0] 
 *       : null
 *   });
 * 
 * Benefits:
 * ✓ Config is single source of truth
 * ✓ Classes are simple, just constructors
 * ✓ Easy to change stats without touching code
 * ✓ All bloons use same pattern
 * 
 * Drawbacks:
 * ✗ No custom logic per bloon (unless you add it)
 * 
 * 
 * APPROACH 2: HYBRID (DEFAULTS + OVERRIDE)
 * ────────────────────────────────────────
 * 
 * Classes have defaults, config can override:
 * 
 *   // CherryBloon.js (WITH DEFAULTS)
 *   export class CherryBloon extends Bloon {
 *     static defaults = {
 *       speed: 100,
 *       reward: 120,
 *       health: 1,
 *       color: 0x0000ff,
 *       size: 50
 *     };
 * 
 *     constructor(pathConfig, overrides = {}) {
 *       const stats = { ...CherryBloon.defaults, ...overrides };
 *       super(pathConfig, stats);
 *     }
 *   }
 * 
 *   // bloonFactory.js creates like this:
 *   const config = getBloonConfig(bloonsConfig, 'cherry');
 *   const cherryBloon = new CherryBloon(pathConfig, config);
 * 
 * Benefits:
 * ✓ Class has defaults (works standalone)
 * ✓ Config can override defaults
 * ✓ Each class shows its own design
 * ✓ Backwards compatible with old code
 * 
 * Drawbacks:
 * ✗ Two places to look for stats (class + config)
 * ✗ Requires keeping defaults in sync
 * 
 * 
 * APPROACH 3: FACTORY PATTERN WITH REGISTRY
 * ──────────────────────────────────────────
 * 
 * Factory handles all instantiation logic:
 * 
 *   // bloonFactory.js
 *   const BLOON_CREATORS = {
 *     'cherry': (path, config) => {
 *       return new CherryBloon(path, {
 *         speed: config.speed || 100,
 *         reward: config.reward || 10,
 *         nextType: config.spawnsOnPop?.[0] || null
 *       });
 *     },
 *     'kiwi': (path, config) => {
 *       return new KiwiBloon(path, {
 *         speed: config.speed || 150,
 *         reward: config.reward || 30,
 *         nextType: config.spawnsOnPop?.[0] || null,
 *         // Custom logic for kiwi
 *       });
 *     }
 *   };
 * 
 *   export function createBloonInstance(path, bloonKey, bloonsConfig) {
 *     const config = getBloonConfig(bloonsConfig, bloonKey);
 *     const creator = BLOON_CREATORS[bloonKey];
 *     if (!creator) throw new Error(`No creator for bloon: ${bloonKey}`);
 *     return creator(path, config);
 *   }
 * 
 * Benefits:
 * ✓ Fine-grained control per bloon type
 * ✓ Can have custom logic per bloon
 * ✓ Config used but classes can still be special
 * 
 * Drawbacks:
 * ✗ More code in factory
 * ✗ Still need to maintain sync
 * 
 * 
 * HOW spawnsOnPop WORKS WITH nextType:
 * ====================================
 * 
 * In bloons.json:
 *   "kiwi": {
 *     "spawnsOnPop": ["cherry", "cherry"],  ← Creates 2 cherries
 *     ...
 *   }
 * 
 * In KiwiBloon.js (OLD):
 *   nextType: 'cherry'  ← Only one type!
 * 
 * The Problem: 
 * - bloons.json says spawn 2 cherries
 * - KiwiBloon.js only has space for 1 nextType
 * - Bloon.js's takeDamage() only spawns ONE nextType
 * 
 * The Solution:
 * We need to update Bloon.js to handle MULTIPLE children:
 * 
 *   takeDamage(amount) {
 *     if (!this.isActive) return;
 *     this.isActive = false;
 *     this._shouldSpawnNextBloon = true;
 *     // NEW: Store array of children to spawn
 *     this._childrenToSpawn = this.nextTypes || [];
 *   }
 * 
 * Then in KiwiBloon.js:
 *   nextTypes: ['cherry', 'cherry']  ← Array of types
 * 
 * Or better, read from config:
 *   nextTypes: config.spawnsOnPop
 * 
 * 
 * RECOMMENDED INTEGRATION (APPROACH 1):
 * ====================================
 * 
 * Step 1: Update Bloon.js base class
 * ─────────────────────────────────────
 * Change from single nextType to array of nextTypes:
 * 
 *   constructor(path, {
 *     nextType = null,        // DEPRECATED
 *     nextTypes = [],         // NEW: Array of child types
 *     ...
 *   } = {}) {
 *     this.nextType = nextType;
 *     this.nextTypes = nextTypes || (nextType ? [nextType] : []);
 *   }
 * 
 * Step 2: Update takeDamage() to spawn multiple
 * ─────────────────────────────────────────────
 * 
 *   takeDamage(amount) {
 *     if (!this.isActive) return;
 *     this.isActive = false;
 *     this._shouldSpawnNextBloons = true;
 *     this._childrenToSpawn = this.nextTypes || [];
 *   }
 * 
 * Step 3: Update animation completion to spawn children
 * ─────────────────────────────────────────────────────
 * 
 *   if (this._shouldSpawnNextBloons && this._childrenToSpawn?.length > 0) {
 *     const spawnChildBloons = async () => {
 *       await spawnChildBloons(
 *         this,
 *         this._childrenToSpawn,
 *         window.bloonsConfig,
 *         window.sceneRef.gameLogic
 *       );
 *     };
 *     spawnChildBloons();
 *   }
 * 
 * Step 4: Simplify bloon classes
 * ──────────────────────────────
 * 
 *   // CherryBloon.js (SIMPLIFIED)
 *   export class CherryBloon extends Bloon {
 *     constructor(pathConfig, configData = {}) {
 *       super(pathConfig, configData);
 *     }
 *   }
 * 
 *   // All bloons look the same now!
 *   // Everything is driven by config
 * 
 * Step 5: Use factory to create
 * ─────────────────────────────
 * 
 *   const config = getBloonConfig(bloonsConfig, 'kiwi');
 *   const kiwiBloon = new KiwiBloon(path, {
 *     level: 2,
 *     nextTypes: config.spawnsOnPop,  // [cherry, cherry]
 *     speed: config.speed,
 *     reward: config.reward,
 *     color: config.color,
 *     size: config.size,
 *     spritesheet: config.spritesheet,
 *     frameCount: config.frameCount
 *   });
 * 
 * 
 * USAGE IN PRACTICE:
 * ==================
 * 
 * // Old way (hardcoded):
 * const cherry = new CherryBloon(path);  ← Stats are fixed
 * 
 * // New way (config-driven):
 * const cherry = await createBloonInstance(path, 'cherry', bloonsConfig);
 * ↓
 * - Reads stats from bloons.json
 * - Imports CherryBloon class
 * - Creates instance with config values
 * - Sets nextTypes from spawnsOnPop
 * 
 * 
 * DATA FLOW:
 * ==========
 * 
 * bloons.json
 *     ↓ (read by)
 * bloonFactory.js
 *     ↓ (calls)
 * CherryBloon / KiwiBloon / etc (classes)
 *     ↓ (extends)
 * Bloon base class
 *     ↓ (updates)
 * game logic (enemies array)
 *     ↓ (on death, reads)
 * bloonFactory.spawnChildBloons()
 *     ↓ (creates new instances)
 * Child bloons (with config stats)
 * 
 * 
 * MIGRATION CHECKLIST:
 * ====================
 * 
 * [ ] 1. Update Bloon.js base class:
 *        - Add nextTypes array
 *        - Update takeDamage() to handle multiple
 *        - Update spawn logic to use factory
 * 
 * [ ] 2. Simplify all bloon classes:
 *        - Remove hardcoded stats
 *        - Accept configData parameter
 *        - Pass to super()
 * 
 * [ ] 3. Update bloonFactory.js:
 *        - Implement spawnChildBloons() function
 *        - Handle async class importing
 *        - Set nextTypes from config
 * 
 * [ ] 4. Update scene/game logic:
 *        - Load bloons.json config
 *        - Pass to createBloonInstance()
 *        - Set window.bloonsConfig for reference
 * 
 * [ ] 5. Update wave spawning:
 *        - Use factory to create bloons
 *        - Config drives all stats
 * 
 * [ ] 6. Test:
 *        - Verify bloons spawn with correct stats
 *        - Verify children spawn on pop
 *        - Verify config changes affect game
 * 
 */
