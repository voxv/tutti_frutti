# Global Scale System - Quick Reference

## TL;DR - How to Scale Your Game

### Step 1: Edit One Line
Open [src/client/utils/scaleConfig.js](src/client/utils/scaleConfig.js) and change:

```javascript
export const GAME_SCALE = 1.0;  // Change this number
```

### Step 2: Common Values

```javascript
GAME_SCALE = 0.5   // Half size (800×450)
GAME_SCALE = 1.0   // Original (1600×900)  
GAME_SCALE = 1.5   // 50% bigger (2400×1350)
GAME_SCALE = 2.0   // Double size (3200×1800)
```

### Step 3: Reload Your Game
Save the file and reload your browser. Done! ✓

---

## What Scales

Everything visual scales proportionally:
- ✓ Game window size
- ✓ All UI elements
- ✓ Text and fonts
- ✓ Buttons and panels
- ✓ Tower shop grid
- ✓ Info bar
- ✓ Range circles
- ✓ Tooltips
- ✓ Padding and spacing

## What Doesn't Change

Game logic stays identical:
- ✗ Tower damage/range logic
- ✗ Enemy health/speed
- ✗ Wave difficulty
- ✗ Collision detection

The game plays exactly the same, just looks bigger or smaller.

---

## Files Modified

- `src/client/utils/scaleConfig.js` ← **Edit this file**
- `src/client/main.js` - Uses GAME_WIDTH, GAME_HEIGHT
- `src/client/scenes/BalouneScene.js` - Uses scaled dimensions
- `src/client/logic/towerPlacement.js` - Bounds checking
- `src/client/logic/enemyRender.js` - Out-of-bounds detection
- `src/client/ui/shopUI.js` - Shop scaling
- `src/client/utils/sceneSetup.js` - Setup scaling

---

## Variables Available

From `scaleConfig.js`:

```javascript
import { 
  GAME_SCALE,              // Your scale factor (0.5, 1.0, 2.0, etc)
  GAME_WIDTH,              // Scaled canvas width
  GAME_HEIGHT,             // Scaled canvas height
  SCALED_SHOP_WIDTH,       // Scaled shop panel width
  SCALED_INFO_BAR_HEIGHT,  // Scaled info bar height
  getScaledValue,          // Helper: scales any number
  getScaledDimensions      // Helper: scales width & height
} from '../utils/scaleConfig.js';
```

---

## Common Patterns Used

```javascript
// Scale a dimension
const scaledWidth = 100 * GAME_SCALE;

// Scale font size
const fontSize = `${Math.round(14 * GAME_SCALE)}px Arial`;

// Scale padding
padding: { x: Math.round(20 * GAME_SCALE), y: Math.round(10 * GAME_SCALE) }

// Use pre-scaled variables
const shopWidth = SCALED_SHOP_WIDTH;  // Already scaled
const barHeight = SCALED_INFO_BAR_HEIGHT;  // Already scaled
```

---

## Examples

### Make game 75% smaller
```javascript
export const GAME_SCALE = 0.25;  // Canvas becomes 400×225
```

### Make game 50% larger
```javascript
export const GAME_SCALE = 1.5;  // Canvas becomes 2400×1350
```

### Responsive (for mobile/tablet)
```javascript
// At top of main.js
const isMobile = window.innerWidth < 800;
export const GAME_SCALE = isMobile ? 0.7 : 1.0;
```

---

## Troubleshooting

**Canvas is cut off?**
- Make sure your browser window/screen is large enough
- Try a smaller GAME_SCALE value

**UI overlapping?**
- This shouldn't happen - all spacing scales proportionally
- Try reloading the page (Ctrl+Shift+R or Cmd+Shift+R)

**Text looks blurry?**
- Some browsers blur at certain scales
- This is normal and unavoidable with web scaling
- Try a different GAME_SCALE value

**Game seems harder/easier?**
- Game logic doesn't change with scale
- Everything should play identically
- If you notice a difference, it's perceptual (visuals are different)

---

## Summary

This is a **visual scaling system only**. The game layout, UI, text, buttons, and graphics all scale proportionally when you change `GAME_SCALE`. Game difficulty and mechanics remain unchanged.

Adjust `GAME_SCALE` in `src/client/utils/scaleConfig.js` and reload!
