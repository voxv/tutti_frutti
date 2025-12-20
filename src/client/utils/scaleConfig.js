/**
 * Global Scale Configuration for the entire game
 * 
 * Change SCALE_MODE to adjust how the game scales:
 * - 'auto': Automatically detects window size and snaps to friendly values
 * - 'mobile': Scales for mobile devices (max 0.8)
 * - 'desktop': Scales to fit desktop window
 * - number (e.g., 0.7, 1.0, 1.5): Fixed scale factor
 * 
 * Examples:
 * - GAME_SCALE = 0.5  → Game is 50% of original size (800x450 canvas)
 * - GAME_SCALE = 1.0  → Original size (1600x900 canvas)
 * - GAME_SCALE = 1.5  → Game is 150% of original size (2400x1350 canvas)
 */

// ============================================================================
// CONFIGURATION: Adjust SCALE_MODE to change how the game scales
// ============================================================================
const SCALE_MODE = 'auto';  // 'auto' | 'mobile' | 'desktop' | number (0.5, 1.0, 1.5, etc.)

// Base game dimensions (these will be multiplied by GAME_SCALE)
export const BASE_WIDTH = 1600;
export const BASE_HEIGHT = 900;
export const SHOP_WIDTH = 220;
export const INFO_BAR_HEIGHT = 100;

/**
 * Calculate appropriate GAME_SCALE based on window size
 * @param {string|number} mode - 'auto' (intelligent), 'mobile' (small), 'desktop' (large), or number
 * @returns {number} The calculated scale factor
 */
function calculateResponsiveScale(mode = 'auto') {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  if (typeof mode === 'number') {
    return mode; // Fixed scale
  }
  
  if (mode === 'mobile') {
    // Mobile: fit to smaller screens
    const scaleW = windowWidth / BASE_WIDTH;
    const scaleH = windowHeight / BASE_HEIGHT;
    return Math.min(scaleW, scaleH, 0.8); // Cap at 80% for mobile
  }
  
  if (mode === 'desktop') {
    // Desktop: fit to larger screens
    const scaleW = windowWidth / BASE_WIDTH;
    const scaleH = windowHeight / BASE_HEIGHT;
    return Math.min(scaleW, scaleH);
  }
  
  if (mode === 'auto') {
    // Auto: intelligent scaling based on screen size
    const scaleW = windowWidth / BASE_WIDTH;
    const scaleH = windowHeight / BASE_HEIGHT;
    const scale = Math.min(scaleW, scaleH);
    
    // Snap to friendly values for better appearance
    // Smaller screens get slightly smaller scale values
    if (scale < 0.55) return 0.4;
    if (scale < 0.7) return 0.6;
    if (scale < 1.0) return 0.8;
    if (scale < 1.2) return 1.0;
    if (scale < 1.5) return 1.25;
    if (scale < 1.8) return 1.5;
    return 2.0;
  }
  
  return 1.0; // Default fallback
}

// Initialize GAME_SCALE based on SCALE_MODE
export const GAME_SCALE = calculateResponsiveScale(SCALE_MODE);

/**
 * Export the calculateResponsiveScale function for manual recalculation if window resizes
 */
export { calculateResponsiveScale };

// Scaled dimensions (calculated from base dimensions and GAME_SCALE)
export const GAME_WIDTH = BASE_WIDTH * GAME_SCALE;
export const GAME_HEIGHT = BASE_HEIGHT * GAME_SCALE;
export const SCALED_SHOP_WIDTH = SHOP_WIDTH * GAME_SCALE;
export const SCALED_INFO_BAR_HEIGHT = INFO_BAR_HEIGHT * GAME_SCALE;

/**
 * Helper function to scale any value by the GAME_SCALE factor
 * @param {number} value - The value to scale
 * @returns {number} The scaled value
 */
export function getScaledValue(value) {
  return value * GAME_SCALE;
}

/**
 * Helper function to scale dimensions (width/height)
 * @param {number} width - The width to scale
 * @param {number} height - The height to scale
 * @returns {object} Object with scaled width and height
 */
export function getScaledDimensions(width, height) {
  return {
    width: width * GAME_SCALE,
    height: height * GAME_SCALE
  };
}
