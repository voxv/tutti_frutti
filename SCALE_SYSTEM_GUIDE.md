# Global Game Scale System - User Guide

## Overview

Your game now has a **global scale factor** system that allows you to scale the entire game (graphics, UI, and layout) proportionally without changing the core gameplay logic or asset proportions.

## How to Use

### Changing the Game Scale

Edit the `GAME_SCALE` constant in [src/client/utils/scaleConfig.js](src/client/utils/scaleConfig.js#L13):

```javascript
// ADJUST THIS VALUE TO SCALE THE ENTIRE GAME
export const GAME_SCALE = 1.0;
```

### Scale Examples

| GAME_SCALE | Canvas Size | Use Case |
|-----------|-------------|----------|
| **0.5** | 800×450 | Smaller screen, fit more on display |
| **0.75** | 1200×675 | Slightly smaller |
| **1.0** | 1600×900 | Original size (default) |
| **1.5** | 2400×1350 | Larger, more detailed view |
| **2.0** | 3200×1800 | Double size, touch-friendly |

## What Gets Scaled

✅ **Everything scales proportionally:**
- Canvas/game window dimensions
- Shop UI panel width
- Info bar height
- All font sizes
- All paddings and margins
- Tower placement grid cells
- Tooltips and UI elements
- Enemy and tower sprites (via display size)
- Range circles
- All graphical elements and borders

## What Stays the Same

❌ **Core gameplay is NOT affected:**
- Game logic and AI behavior
- Enemy movement and damage
- Tower firing mechanics
- Path calculations
- No-build zones and collision detection
- Asset image quality (sprites are just scaled for display)
- Game difficulty and balancing

## Implementation Details

### Key Files Modified

1. **[src/client/utils/scaleConfig.js](src/client/utils/scaleConfig.js)** - Central configuration file
   - Define `GAME_SCALE` here
   - Exports `GAME_WIDTH`, `GAME_HEIGHT`, `SCALED_SHOP_WIDTH`, `SCALED_INFO_BAR_HEIGHT`
   - Helper functions for scaling values

2. **[src/client/main.js](src/client/main.js)** - Phaser game initialization
   - Canvas size now uses `GAME_WIDTH` and `GAME_HEIGHT`
   - `GAME_SCALE` exposed globally

3. **[src/client/scenes/BalouneScene.js](src/client/scenes/BalouneScene.js)** - Main game scene
   - Uses scaled dimensions for UI placement
   - Font sizes scale with `GAME_SCALE`

4. **[src/client/logic/towerPlacement.js](src/client/logic/towerPlacement.js)** - Tower drag & drop
   - Drag cells and bounds checking use scaled dimensions
   - Exclusion radius scales appropriately

5. **[src/client/logic/enemyRender.js](src/client/logic/enemyRender.js)** - Enemy rendering
   - Out-of-bounds detection uses scaled dimensions

6. **[src/client/ui/shopUI.js](src/client/ui/shopUI.js)** - Tower shop
   - Shop grid cell sizes scale
   - Tooltip font sizes scale
   - All padding and borders scale

7. **[src/client/utils/sceneSetup.js](src/client/utils/sceneSetup.js)** - Scene initialization
   - Background and graphics use scaled dimensions
   - Error text sizes scale

### How Scaling Works

The system uses a **multiplication approach**:

```javascript
// Base value × GAME_SCALE = Scaled value
const scaledFontSize = 20 * GAME_SCALE;      // 20px becomes 20px, 30px, 40px, etc.
const scaledWidth = 1600 * GAME_SCALE;       // 1600px becomes 800px, 1600px, 3200px, etc.
const scaledPadding = 20 * GAME_SCALE;       // Padding scales proportionally
```

## Testing the Scale

### Quick Test

To test a different scale:

1. Open [src/client/utils/scaleConfig.js](src/client/utils/scaleConfig.js)
2. Change `GAME_SCALE` from `1.0` to `0.5` (or any value)
3. Reload your game in the browser
4. The entire game should resize proportionally

### Verify Everything Scales

Check that:
- ✓ Game canvas is the right size
- ✓ Shop panel is proportionally smaller/larger
- ✓ UI text is readable at the new size
- ✓ Towers can still be placed correctly
- ✓ All tooltips and popups scale properly
- ✓ Info bar and life display scale correctly

## Advanced: Custom Helper Functions

The `scaleConfig.js` file includes helper functions you can use:

```javascript
import { getScaledValue, getScaledDimensions, GAME_SCALE } from '../utils/scaleConfig.js';

// Scale any single value
const scaledRadius = getScaledValue(100);  // 100 * GAME_SCALE

// Scale width and height together
const { width, height } = getScaledDimensions(200, 150);
```

## Performance Notes

- Scaling is calculated **once at startup** - no performance impact during gameplay
- All Phaser objects use the scaled dimensions - rendering is efficient
- Font sizes are rounded to nearest pixel to avoid anti-aliasing artifacts
- No extra re-rendering or recalculation happens with scale changes

## Troubleshooting

### Game looks cut off or too small
- Ensure your monitor/browser window can display the canvas size
- For `GAME_SCALE = 0.5`, the canvas is only 800×450 pixels

### UI elements overlapping
- This shouldn't happen if scale is applied correctly
- Check that all files imported the scale config

### Text is blurry or pixelated
- Font sizes are automatically rounded: `Math.round(size * GAME_SCALE)`
- This is normal for some scaling factors
- Phaser handles the rendering optimization

### Game logic seems different
- **This is expected if assets/sprites look different at different scales**
- The core game logic is **not affected** by scaling
- Only visual presentation changes

## Future Enhancements

You could extend this system to:
- Allow dynamic scale changes during gameplay
- Add responsive scaling based on window size
- Create zoom levels for different views
- Implement separate scale for UI vs. game world

For now, use `GAME_SCALE = 1.0` for the original intended experience, or adjust it for your preferences!
