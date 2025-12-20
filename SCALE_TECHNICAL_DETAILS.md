# Global Scale System - Technical Implementation

## Architecture Overview

The global scale system works by:

1. **Central Configuration** - Single source of truth in `scaleConfig.js`
2. **Export Strategy** - Pre-calculated scaled values exported to all modules
3. **Multiplication Pattern** - All sizes calculated as `baseValue * GAME_SCALE`
4. **Bootstrap** - GAME_SCALE exposed globally in `window.GAME_SCALE` at startup

## Configuration File Structure

### [src/client/utils/scaleConfig.js](src/client/utils/scaleConfig.js)

```javascript
// User-configurable value (change this to scale game)
export const GAME_SCALE = 1.0;

// Base dimensions (unscaled reference values)
export const BASE_WIDTH = 1600;
export const BASE_HEIGHT = 900;
export const SHOP_WIDTH = 220;
export const INFO_BAR_HEIGHT = 100;

// Calculated scaled dimensions (used throughout app)
export const GAME_WIDTH = BASE_WIDTH * GAME_SCALE;
export const GAME_HEIGHT = BASE_HEIGHT * GAME_SCALE;
export const SCALED_SHOP_WIDTH = SHOP_WIDTH * GAME_SCALE;
export const SCALED_INFO_BAR_HEIGHT = INFO_BAR_HEIGHT * GAME_SCALE;

// Helper functions for scaling arbitrary values
export function getScaledValue(value) {
  return value * GAME_SCALE;
}
```

## Module Integration Pattern

### Pattern 1: Direct Import and Use

**towerPlacement.js:**
```javascript
import { GAME_SCALE, GAME_WIDTH, SCALED_SHOP_WIDTH } from "../utils/scaleConfig.js";

// Calculate scaled cell dimensions
const SHOP_CELL_HEIGHT = 100 * GAME_SCALE;

// Use in bounds checking
const isValidDropZone = pointer.x < GAME_WIDTH - SCALED_SHOP_WIDTH;
```

### Pattern 2: Runtime Access via window

**infoBarUI.js** (existing code that was already using this pattern):
```javascript
const heartX = gameWidth - shopWidth - 180 * (window.GAME_SCALE || 1);
const heartY = 40 * (window.GAME_SCALE || 1);
```

The global `window.GAME_SCALE` is set in [main.js](src/client/main.js#L39):
```javascript
window.GAME_SCALE = GAME_SCALE;
```

### Pattern 3: Font Size Scaling

Used throughout for text elements:
```javascript
const fontSize = `${Math.round(14 * GAME_SCALE)}px Arial`;
```

The `Math.round()` ensures crisp text rendering by snapping to integer pixel sizes.

### Pattern 4: Padding and Spacing

```javascript
padding: {
  x: Math.round(20 * GAME_SCALE),
  y: Math.round(10 * GAME_SCALE)
}
```

## Files Modified and How

### 1. [src/client/main.js](src/client/main.js)
**Purpose:** Initialize Phaser with scaled canvas size

```javascript
import { GAME_WIDTH, GAME_HEIGHT, GAME_SCALE } from "./utils/scaleConfig.js";

var config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,      // Uses GAME_WIDTH instead of hardcoded 1600
  height: GAME_HEIGHT,    // Uses GAME_HEIGHT instead of hardcoded 900
  backgroundColor: "#222222",
  scene: [IntroScene, MapSelectScene, BalouneScene],
};

window.GAME_SCALE = GAME_SCALE;  // Make available globally
```

### 2. [src/client/scenes/BalouneScene.js](src/client/scenes/BalouneScene.js)
**Purpose:** Use scaled dimensions for scene setup and UI placement

```javascript
// Removed hardcoded: const gameWidth = 1600; const shopWidth = 220;
// Now uses:
import { GAME_SCALE, GAME_WIDTH, GAME_HEIGHT, SCALED_SHOP_WIDTH, SCALED_INFO_BAR_HEIGHT } from "../utils/scaleConfig.js";

// In create() - using GAME_WIDTH directly
const gameWidth = this.scale.width;  // Already scaled by Phaser

// Font sizes scale
font: `${Math.round(28 * GAME_SCALE)}px Arial`

// Positioning uses scaled dimensions
gameWidth - SCALED_SHOP_WIDTH / 2
```

### 3. [src/client/logic/towerPlacement.js](src/client/logic/towerPlacement.js)
**Purpose:** Scale tower placement grid and bounds checking

```javascript
import { GAME_SCALE, GAME_WIDTH, SCALED_SHOP_WIDTH, SCALED_INFO_BAR_HEIGHT } from "../utils/scaleConfig.js";

// Grid cells scale with the game
const SHOP_CELL_WIDTH = SCALED_SHOP_WIDTH / 2;
const SHOP_CELL_HEIGHT = 100 * GAME_SCALE;

// Exclusion radius scales (affects tower placement rules)
const EXCLUSION_RADIUS = 60 * GAME_SCALE;

// Bounds checking uses scaled values
const isValidDropZone = 
  pointer.x >= 0 && pointer.x < GAME_WIDTH - SCALED_SHOP_WIDTH &&
  pointer.y >= 0 && pointer.y < GAME_HEIGHT - SCALED_INFO_BAR_HEIGHT;
```

### 4. [src/client/logic/enemyRender.js](src/client/logic/enemyRender.js)
**Purpose:** Out-of-bounds detection uses scaled game area

```javascript
import { GAME_WIDTH, GAME_HEIGHT, SCALED_SHOP_WIDTH, SCALED_INFO_BAR_HEIGHT } from "../utils/scaleConfig.js";

// Out of bounds detection updated to use scaled dimensions
const outOfBounds = 
  e.position.x < 0 || 
  e.position.x > GAME_WIDTH - SCALED_SHOP_WIDTH || 
  e.position.y < 0 || 
  e.position.y > GAME_HEIGHT - SCALED_INFO_BAR_HEIGHT;
```

### 5. [src/client/ui/shopUI.js](src/client/ui/shopUI.js)
**Purpose:** Shop UI grid and tooltips scale

```javascript
import { GAME_SCALE } from "../utils/scaleConfig.js";

// Grid cell height scales
const cellHeight = 100 * GAME_SCALE;

// Tooltip font sizes
fontSize: `${Math.round(18 * GAME_SCALE)}px`,

// Borders and spacing scale
scene.shopGrid.lineStyle(Math.round(3 * GAME_SCALE), 0x000000, 1);
```

### 6. [src/client/utils/sceneSetup.js](src/client/utils/sceneSetup.js)
**Purpose:** Scene initialization uses scaled dimensions

```javascript
import { GAME_SCALE } from "./scaleConfig.js";

// Error text scales with game
scene.add.text(600 * GAME_SCALE, 400 * GAME_SCALE, "Error!", { 
  font: `${Math.round(32 * GAME_SCALE)}px Arial`
});
```

## Scaling Calculation Examples

### Canvas Size
```
Original: 1600 × 900
GAME_SCALE = 0.5:  800 × 450
GAME_SCALE = 1.0: 1600 × 900
GAME_SCALE = 2.0: 3200 × 1800
```

### Shop Panel Width
```
Original: 220px
GAME_SCALE = 0.5:  110px
GAME_SCALE = 1.0:  220px
GAME_SCALE = 2.0:  440px
```

### Font Size
```
Original: 28px
GAME_SCALE = 0.5:  14px (rounded)
GAME_SCALE = 1.0:  28px
GAME_SCALE = 2.0:  56px
```

### Tower Placement Grid Cell
```
Original: 110px wide (220 / 2), 100px tall
GAME_SCALE = 0.75: 82.5px wide, 75px tall
GAME_SCALE = 1.0: 110px wide, 100px tall
GAME_SCALE = 1.5: 165px wide, 150px tall
```

## Data Flow

```
scaleConfig.js (GAME_SCALE = 1.0)
    ↓
    ├─→ main.js (creates canvas with GAME_WIDTH, GAME_HEIGHT)
    ├─→ BalouneScene.js (creates UI with scaled dimensions)
    ├─→ towerPlacement.js (grid and bounds use scaled values)
    ├─→ enemyRender.js (out-of-bounds checks use scaled bounds)
    ├─→ shopUI.js (shop grid uses scaled cells)
    └─→ sceneSetup.js (scene uses scaled dimensions)
```

## Game Logic Isolation

**Important:** Game logic files are NOT modified:

- `src/engine/` - Physics, pathfinding, damage calculation
- `src/game/` - Enemy classes, tower classes, projectile logic
- Game math/collision operates in **logical space**, not visual space
- Visual rendering applies scale at display time only

Example: A tower with range 100 is still range 100 in game logic, but displays with scaled radius visually.

## Performance Impact

- **Zero runtime cost:** Scale is calculated once at startup
- **No per-frame calculations:** All values pre-calculated
- **Efficient rendering:** Phaser's display system handles scaling internally
- **Memory:** Minimal overhead, no additional textures or objects

## Future Extension Points

1. **Dynamic scaling:** Could call a function to change `GAME_SCALE` at runtime
2. **Responsive scaling:** Auto-scale based on window/device size
3. **Separate UI scale:** Could have `GAME_SCALE` for world, `UI_SCALE` for interface
4. **Zoom levels:** Multiple predefined scales as game modes
5. **Settings menu:** User-selectable scale preference

## Best Practices Applied

✓ **Single Responsibility:** scaleConfig.js only handles scaling
✓ **DRY (Don't Repeat Yourself):** Base values defined once
✓ **Consistent Pattern:** Same multiplication approach throughout
✓ **Non-intrusive:** Game logic files untouched
✓ **Backward compatible:** Old hardcoded values replaced cleanly
✓ **Documented:** Clear comments in configuration file

## Testing Recommendations

1. Test with GAME_SCALE values: 0.25, 0.5, 0.75, 1.0, 1.5, 2.0
2. Verify UI doesn't overlap or break at extreme scales
3. Check that gameplay is identical regardless of scale
4. Test on different screen sizes/devices
5. Verify font readability at each scale

## Conclusion

This implementation provides a simple, efficient, and maintainable way to scale the entire visual presentation of the game while keeping game logic completely unchanged. Change one number, reload, and the entire game scales proportionally!
