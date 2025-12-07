// Tower Class Registry - Import all tower classes statically for Vite bundling
import { KnifeTower } from './KnifeTower.js';
import { CannonTower } from './CannonTower.js';
import { GlacialTower } from './GlacialTower.js';
import { LaserTower } from './LaserTower.js';
import { SpikeTower } from './SpikeTower.js';
import { GlueTower } from './GlueTower.js';
import { BirdTower } from './BirdTower.js';
import { SniperTower } from './SniperTower.js';
import { DartMonkeyTower } from './DartMonkeyTower.js';

/**
 * Static registry of all tower classes
 * This ensures Vite bundles all classes and they're available at runtime
 */
export const TOWER_REGISTRY = {
  KnifeTower,
  CannonTower,
  GlacialTower,
  LaserTower,
  SpikeTower,
  GlueTower,
  BirdTower,
  SniperTower,
  DartMonkeyTower
};

/**
 * Get a tower class from the registry
 * @param {string} className - The class name
 * @returns {Promise} Promise that resolves with the tower class
 */
export function importTowerClassFromRegistry(className) {
  const TowerClass = TOWER_REGISTRY[className];
  if (!TowerClass) {
    return Promise.reject(new Error(`Tower class ${className} not found in registry`));
  }
  return Promise.resolve({ TowerClass });
}
