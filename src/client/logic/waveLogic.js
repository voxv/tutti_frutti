// src/client/logic/waveLogic.js
// Handles wave parsing and spawning logic for Bloons game

// Use global wavesConfig from main.js
const wavesConfig = window.wavesConfig || {};

/**
 * Parses a wave string into an array of bloon spawn instructions.
 * @param {string} waveStr - Example: "12x cherry | delay=0.3, 10x banana | delay=0.5"
 * @returns {Array<{type: string, delay: number}>}
 */
export function parseWaveString(waveStr) {
  const parts = waveStr.split(',');
  const result = [];
  for (const part of parts) {
    const trimmed = part.trim();
    // Check for pause or wait entry
    const pauseMatch = trimmed.match(/(?:pause|wait)\s*=\s*([0-9.]+)/i);
    if (pauseMatch) {
      const pauseTime = parseFloat(pauseMatch[1]);
      result.push({ pause: true, delay: pauseTime });
      continue;
    }
    // Support parallel spawns with +
    const parallelGroups = trimmed.split('+').map(g => g.trim());
    if (parallelGroups.length > 1) {
      // Parse each group and collect their delays
      const groupEntries = [];
      let maxDelay = 0.5;
      for (const group of parallelGroups) {
        const [bloonPart, delayPart] = group.split('|');
        const match = bloonPart.trim().match(/(\d+)x\s*(\w+)/);
        let delay = 0.5;
        if (delayPart) {
          const delayMatch = delayPart.match(/delay\s*=\s*([0-9.]+)/);
          if (delayMatch) {
            delay = parseFloat(delayMatch[1]);
          }
        }
        if (match) {
          const count = parseInt(match[1], 10);
          const type = match[2];
          for (let i = 0; i < count; i++) {
            groupEntries.push({ type, delay });
          }
          if (delay > maxDelay) maxDelay = delay;
        }
      }
      result.push({ parallel: true, entries: groupEntries, delay: maxDelay });
      continue;
    }
    // Single spawn (not parallel)
    const [bloonPart, delayPart] = trimmed.split('|');
    const match = bloonPart.trim().match(/(\d+)x\s*(\w+)/);
    let delay = 0.5;
    if (delayPart) {
      const delayMatch = delayPart.match(/delay\s*=\s*([0-9.]+)/);
      if (delayMatch) {
        delay = parseFloat(delayMatch[1]);
      }
    }
    if (match) {
      const count = parseInt(match[1], 10);
      const type = match[2];
      for (let i = 0; i < count; i++) {
        result.push({ type, delay });
      }
    }
  }
  return result;
}

/**
 * Handles spawning a wave in the game logic.
 * @param {object} scene - The Phaser scene (for context, UI updates, etc.)
 * @param {object} gameLogic - The game logic instance (should have spawnWave method).
 * @param {number} waveIndex - The index of the wave to spawn.
 * @returns {void}
 */
export function spawnWave(scene, gameLogic, waveIndex) {
  const waveStr = wavesConfig.waves[waveIndex % wavesConfig.waves.length];
  const waveArray = parseWaveString(waveStr);
  gameLogic.spawnWave(waveArray);
  // Optionally update UI, wave number, etc. in the scene here if needed
}
