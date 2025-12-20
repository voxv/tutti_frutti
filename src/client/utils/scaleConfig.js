/**
 * Global Scale Configuration for the entire game
 * 
 * Modify GAME_SCALE to scale the entire game (0.5 = 50% size, 2.0 = 200% size, etc.)
 * All graphical elements, UI, and game mechanics will scale proportionally
 * 
 * Examples:
 * - GAME_SCALE = 0.5  → Game is 50% of original size (800x450 canvas)
 * - GAME_SCALE = 1.0  → Original size (1600x900 canvas)
 * - GAME_SCALE = 1.5  → Game is 150% of original size (2400x1350 canvas)
 */

// ADJUST THIS VALUE TO SCALE THE ENTIRE GAME
export const GAME_SCALE = 0.7;

// Base game dimensions (these will be multiplied by GAME_SCALE)
export const BASE_WIDTH = 1600;
export const BASE_HEIGHT = 900;
export const SHOP_WIDTH = 220;
export const INFO_BAR_HEIGHT = 100;

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
