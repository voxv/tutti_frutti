// Enemy rendering logic for bloons/enemies
// Exports a function to render all enemies

import { GAME_SCALE, GAME_WIDTH, GAME_HEIGHT, SCALED_SHOP_WIDTH, SCALED_INFO_BAR_HEIGHT } from "../utils/scaleConfig.js";

export function renderEnemies(scene) {
  // Draw all active bloons/enemies
  if (!scene.gameLogic || !scene.gameLogic.enemies) return;
  if (!scene.enemyGraphics) {
    scene.enemyGraphics = scene.add.graphics();
  }
  scene.enemyGraphics.clear();
  // Check for escaped bloons and decrease player health BEFORE drawing
  if (!scene._escapedBloons) scene._escapedBloons = new Set();
  for (const e of scene.gameLogic.enemies) {
    if (!e) continue;
    // Only mark as escaped for rendering, do not subtract health here
    if (!e.isActive && !scene._escapedBloons.has(e) && e.isAtEnd && e.isAtEnd()) {
      scene._escapedBloons.add(e);
    }
  }
  for (const e of scene.gameLogic.enemies) {
    if (!e) continue;
    const outOfBounds = e.position.x < 0 || e.position.x > GAME_WIDTH - SCALED_SHOP_WIDTH || e.position.y < 0 || e.position.y > GAME_HEIGHT - SCALED_INFO_BAR_HEIGHT;
    // Always call updateAnimation if sprite exists and bloon uses spritesheet
    if (e.spritesheet && scene.textures.exists(e.spritesheet) && e.frameCount > 1) {
      const multiplier = (window.BLOON_SIZE_MULTIPLIER || 1) * GAME_SCALE;
      if (!e._sprite) {
        e._sprite = scene.add.sprite(e.position.x, e.position.y, e.spritesheet, 0)
          .setDisplaySize((e.size ?? 60) * multiplier, (e.size ?? 60) * multiplier)
          .setDepth(outOfBounds ? 5 : 21);
      } else {
        e._sprite.setPosition(e.position.x, e.position.y);
        e._sprite.setDepth(outOfBounds ? 5 : 21);
      }
      if (e._sprite && typeof e.updateAnimation === 'function') {
        e.updateAnimation(e._sprite, 16);
      }
      // Force-destroy sprite if animation is finished but sprite is still present
      if (!e.isActive && !e.animPlaying && e._sprite) {
        e._sprite.destroy();
        e._sprite = null;
      }
      continue;
    }
    // Static image bloons
    if (e.image && scene.textures.exists(e.image)) {
      const multiplier = (window.BLOON_SIZE_MULTIPLIER || 1) * GAME_SCALE;
      if (!e._sprite && e.isActive) {
        e._sprite = scene.add.image(e.position.x, e.position.y, e.image)
          .setDisplaySize((e.size ?? 20) * multiplier, (e.size ?? 20) * multiplier)
          .setDepth(outOfBounds ? 5 : 21);
      } else if (e._sprite) {
        e._sprite.setPosition(e.position.x, e.position.y);
        e._sprite.setDepth(outOfBounds ? 5 : 21);
      }
      if ((!e.isActive || outOfBounds) && e._sprite) {
        if (!e.isActive) {
          e._sprite.destroy();
          e._sprite = null;
        }
      }
      continue;
    }
    // Fallback to colored circle
    if (e.isActive) {
      const multiplier = (window.BLOON_SIZE_MULTIPLIER || 1) * GAME_SCALE;
      scene.enemyGraphics.fillStyle(e.color ?? 0xff0000, 1);
      scene.enemyGraphics.fillCircle(e.position.x, e.position.y, (e.size ?? 20) * multiplier);
      // Lower depth for outOfBounds circles (not strictly needed for graphics, but for consistency)
      if (outOfBounds && e._sprite) {
        e._sprite.setDepth(2);
      }
    }
    if ((!e.isActive || outOfBounds) && e._sprite) {
      if (!e.isActive) {
        e._sprite.destroy();
        e._sprite = null;
      }
    }
  }
}
