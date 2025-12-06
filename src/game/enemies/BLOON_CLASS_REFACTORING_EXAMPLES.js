/**
 * BLOON CLASS REFACTORING EXAMPLES
 * ================================
 * 
 * This shows how to refactor individual bloon classes to work with bloons.json config
 * 
 */

// ══════════════════════════════════════════════════════════════════════════════
// CURRENT APPROACH (Hardcoded in classes)
// ══════════════════════════════════════════════════════════════════════════════

/*
// Current CherryBloon.js
export class CherryBloon extends Bloon {
  constructor(pathConfig) {
    super(pathConfig, {
      level: 1,
      nextType: null,
      speed: 100,
      reward: 120,
      color: 0x0000ff,
      size: 50
    });
  }
}

// Current KiwiBloon.js
export class KiwiBloon extends Bloon {
  constructor(pathConfig) {
    super(pathConfig, {
      level: 2,
      nextType: 'cherry',         ← Only one type!
      speed: 150,
      reward: 30,
      color: 0x00ff00,
      size: 50
    });
  }
}

Problems:
- Stats hardcoded (can't change without editing class)
- nextType only supports ONE child type
- bloons.json defines 2 cherries but class only stores 1
- No way to override without creating new class
*/


// ══════════════════════════════════════════════════════════════════════════════
// NEW APPROACH 1: PURE CONFIG-DRIVEN (RECOMMENDED)
// ══════════════════════════════════════════════════════════════════════════════

/*
// New CherryBloon.js (SIMPLIFIED)
import { Bloon } from "./Bloon.js";

export class CherryBloon extends Bloon {
  constructor(pathConfig, configData = {}) {
    super(pathConfig, configData);
  }
}

// New KiwiBloon.js (SIMPLIFIED)
export class KiwiBloon extends Bloon {
  constructor(pathConfig, configData = {}) {
    super(pathConfig, configData);
  }
}

// Usage in bloonFactory.js:
export async function createBloonInstance(path, bloonKey, bloonsConfig) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  const className = getBloonClassName(bloonKey);
  const { BloonClass } = await importBloonClass(className);
  
  return new BloonClass(path, {
    level: 1,
    nextTypes: config.spawnsOnPop,  ← Array of children!
    speed: config.speed,
    reward: config.reward,
    color: parseInt(config.color),
    size: config.size,
    spritesheet: config.spritesheet,
    frameCount: config.frameCount,
    frameWidth: config.frameWidth,
    frameHeight: config.frameHeight
  });
}

Benefits:
✓ All classes identical - no code duplication
✓ All stats in config - single source of truth
✓ Supports multiple children via nextTypes array
✓ Easy to add new bloon - just add to config
✓ Easy to balance - change config, not code
✓ Can spawn 2+ children per bloon

How it works:
1. bloonFactory reads config for 'kiwi'
2. Config says: spawnsOnPop: ["cherry", "cherry"]
3. Factory creates KiwiBloon with nextTypes: ["cherry", "cherry"]
4. When popped, spawns both cherries
*/


// ══════════════════════════════════════════════════════════════════════════════
// NEW APPROACH 2: HYBRID (DEFAULTS + CONFIG OVERRIDE)
// ══════════════════════════════════════════════════════════════════════════════

/*
// CherryBloon.js with defaults (still simple, but has fallbacks)
import { Bloon } from "./Bloon.js";

export class CherryBloon extends Bloon {
  static defaults = {
    level: 1,
    speed: 100,
    reward: 120,
    color: 0x0000ff,
    size: 50,
    spritesheet: 'cherries_anim',
    frameCount: 3,
    frameWidth: 208,
    frameHeight: 201
  };

  constructor(pathConfig, configData = {}) {
    const merged = { ...CherryBloon.defaults, ...configData };
    super(pathConfig, merged);
  }
}

// Usage:
// With config:
const cherry = new CherryBloon(path, bloonsConfig.bloons.cherry);

// Without config (uses defaults):
const cherry = new CherryBloon(path);

Benefits:
✓ Classes have defaults (backwards compatible)
✓ Config can override
✓ Can be used standalone or via factory
✗ Duplication between class defaults and config
✗ Need to keep in sync
*/


// ══════════════════════════════════════════════════════════════════════════════
// NEW APPROACH 3: FACTORY PATTERN WITH REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

/*
// In bloonFactory.js
const BLOON_CREATORS = {
  'cherry': (path, config) => {
    return new CherryBloon(path, {
      level: 1,
      nextTypes: config.spawnsOnPop,
      speed: config.speed,
      reward: config.reward,
      color: parseInt(config.color),
      size: config.size,
      spritesheet: config.spritesheet,
      frameCount: config.frameCount
    });
  },
  
  'kiwi': (path, config) => {
    return new KiwiBloon(path, {
      level: 2,
      nextTypes: config.spawnsOnPop,
      speed: config.speed,
      reward: config.reward,
      color: parseInt(config.color),
      size: config.size,
      spritesheet: config.spritesheet,
      frameCount: config.frameCount
      // Can add custom kiwi logic here
    });
  }
};

export function createBloonInstance(path, bloonKey, bloonsConfig) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  const creator = BLOON_CREATORS[bloonKey];
  if (!creator) throw new Error(`No creator for bloon: ${bloonKey}`);
  return creator(path, config);
}

Benefits:
✓ Fine-grained control per bloon
✓ Can have custom logic
✗ More code to maintain
*/


// ══════════════════════════════════════════════════════════════════════════════
// UPDATING Bloon.js BASE CLASS
// ══════════════════════════════════════════════════════════════════════════════

/*
// Current Bloon.js
export class Bloon extends Enemy {
  constructor(path, {
    level = 1,
    nextType = null,        ← Only one type
    speed = 50,
    reward = 1,
    ...
  } = {}) {
    this.nextType = nextType;
    ...
  }
  
  takeDamage(amount) {
    if (!this.isActive) return;
    this.isActive = false;
    this._shouldSpawnNextBloon = true;  ← Single bloon
  }
}

// Updated Bloon.js
export class Bloon extends Enemy {
  constructor(path, {
    level = 1,
    nextType = null,          ← Keep for backwards compat
    nextTypes = [],           ← NEW: Array of types
    speed = 50,
    reward = 1,
    ...
  } = {}) {
    this.nextType = nextType;
    this.nextTypes = nextTypes || (nextType ? [nextType] : []);
    ...
  }
  
  takeDamage(amount) {
    if (!this.isActive) return;
    this.isActive = false;
    this._shouldSpawnNextBloons = true;  ← Multiple bloons
    this._childrenToSpawn = this.nextTypes;
  }
  
  // In animation finish handler:
  if (this._shouldSpawnNextBloons && this._childrenToSpawn?.length > 0) {
    // Import factory to avoid circular dependency
    const { spawnChildBloons } = await import('../../client/factories/bloonFactory.js');
    
    await spawnChildBloons(
      this,
      this._childrenToSpawn,
      window.bloonsConfig,
      window.sceneRef.gameLogic
    );
    
    this._shouldSpawnNextBloons = false;
  }
}

Benefits:
✓ Supports multiple children
✓ Backwards compatible (nextType still works)
✓ Uses factory for creation
✓ Clean separation of concerns
*/


// ══════════════════════════════════════════════════════════════════════════════
// COMPLETE INTEGRATION EXAMPLE
// ══════════════════════════════════════════════════════════════════════════════

/*
// 1. bloons.json (configuration)
{
  "bloons": {
    "cherry": {
      "displayName": "Cherry Bloon",
      "health": 1,
      "speed": 100,
      "reward": 120,
      "spawnsOnPop": null,
      "spritesheet": "cherries_anim",
      "frameCount": 3
    },
    "kiwi": {
      "displayName": "Kiwi Bloon",
      "health": 2,
      "speed": 150,
      "reward": 30,
      "spawnsOnPop": ["cherry", "cherry"],  ← 2 children!
      "spritesheet": "kiwi_anim",
      "frameCount": 3
    }
  }
}

// 2. CherryBloon.js (simplified)
export class CherryBloon extends Bloon {
  constructor(pathConfig, configData = {}) {
    super(pathConfig, configData);
  }
}

// 3. KiwiBloon.js (simplified)
export class KiwiBloon extends Bloon {
  constructor(pathConfig, configData = {}) {
    super(pathConfig, configData);
  }
}

// 4. bloonFactory.js
export async function createBloonInstance(path, bloonKey, bloonsConfig) {
  const config = getBloonConfig(bloonsConfig, bloonKey);
  const className = getBloonClassName(bloonKey);
  const { BloonClass } = await importBloonClass(className);
  
  return new BloonClass(path, {
    level: 1,
    nextTypes: config.spawnsOnPop,  ← From config!
    speed: config.speed,
    reward: config.reward,
    color: parseInt(config.color),
    size: config.size,
    spritesheet: config.spritesheet,
    frameCount: config.frameCount
  });
}

// 5. Usage in scene
import bloonsConfig from './src/game/enemies/bloons.json';
import { createBloonInstance, spawnChildBloons } from './factories/bloonFactory.js';

// Create a kiwi bloon:
const kiwi = await createBloonInstance(path, 'kiwi', bloonsConfig);

// When kiwi dies:
// → Reads nextTypes: ["cherry", "cherry"]
// → Calls spawnChildBloons()
// → Creates 2 CherryBloon instances with config stats
// → Adds them to game

Data flow:
bloons.json (kiwi.spawnsOnPop = ["cherry", "cherry"])
    ↓
KiwiBloon instance (nextTypes = ["cherry", "cherry"])
    ↓
takeDamage() called
    ↓
_childrenToSpawn = ["cherry", "cherry"]
    ↓
spawnChildBloons(this, ["cherry", "cherry"], config, gameLogic)
    ↓
for each childType:
  - createBloonInstance(path, childType, config)
  - new CherryBloon(path, configData)
  - add to gameLogic.enemies
    ↓
2 CherryBloons appear in game!
*/


// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY: THE THREE CHANGES NEEDED
// ══════════════════════════════════════════════════════════════════════════════

/*
CHANGE 1: Update Bloon.js
────────────────────────
- Add nextTypes array parameter
- Update takeDamage() to use _childrenToSpawn
- Add async spawn logic using factory

CHANGE 2: Simplify bloon classes
────────────────────────────────
- Accept configData parameter
- Pass to super() constructor
- Remove hardcoded stats

CHANGE 3: Create bloonFactory
─────────────────────────────
- Create instances from config
- Import correct class dynamically
- Set nextTypes from spawnsOnPop
- Provide spawnChildBloons() function

After these changes:
✓ All bloon stats in bloons.json
✓ Supports multiple children per bloon
✓ Easy to balance/modify
✓ No code duplication in classes
✓ Config is single source of truth
*/
