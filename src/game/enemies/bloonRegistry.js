// Bloon Class Registry - Import all bloon classes statically for Vite bundling
import { RedBloon } from './RedBloon.js';
import { BlueBloon } from './BlueBloon.js';
import { GreenBloon } from './GreenBloon.js';
import { YellowBloon } from './YellowBloon.js';
import { PurpleBloon } from './PurpleBloon.js';
import { BlackBloon } from './BlackBloon.js';
import { WhiteBloon } from './WhiteBloon.js';
import { BananaBloon } from './BananaBloon.js';
import { CherryBloon } from './CherryBloon.js';
import { KiwiBloon } from './KiwiBloon.js';
import { AppleBloon } from './AppleBloon.js';
import { OrangeBloon } from './OrangeBloon.js';
import { MelonBloon } from './MelonBloon.js';
import { CoconutBloon } from './CoconutBloon.js';
import { BossBloon } from './BossBloon.js';

/**
 * Static registry of all bloon classes
 * This ensures Vite bundles all classes and they're available at runtime
 */
export const BLOON_REGISTRY = {
  RedBloon,
  BlueBloon,
  GreenBloon,
  YellowBloon,
  PurpleBloon,
  BlackBloon,
  WhiteBloon,
  BananaBloon,
  CherryBloon,
  KiwiBloon,
  AppleBloon,
  OrangeBloon,
  MelonBloon,
  CoconutBloon,
  BossBloon
};

/**
 * Get a bloon class from the registry
 * @param {string} className - The class name
 * @returns {Promise} Promise that resolves with the bloon class
 */
export function importBloonClassFromRegistry(className) {
  const BloonClass = BLOON_REGISTRY[className];
  if (!BloonClass) {
    return Promise.reject(new Error(`Bloon class ${className} not found in registry`));
  }
  return Promise.resolve({ BloonClass });
}
