// src/client/renderer/enemyRenderer.js
// Handles rendering of enemies (bloons) for the game scene

export function renderEnemies(scene) {
  // Draw all active bloons/enemies
  if (!scene.gameLogic || !scene.gameLogic.enemies) return;
  if (!scene.enemyGraphics) {
    scene.enemyGraphics = scene.add.graphics();
    scene.enemyGraphics.setDepth(3500); // Ensure graphics are visible above other elements
  }
  scene.enemyGraphics.clear();
  // Check for escaped bloons and decrease player health BEFORE drawing
  if (!scene._escapedBloons) scene._escapedBloons = new Set();
  for (const e of scene.gameLogic.enemies) {
    if (!e) continue;
    // Only mark as escaped for rendering, do not subtract health here
    if (!e.isActive && !scene._escapedBloons.has(e) && e.isAtEnd && e.isAtEnd()) {
      // Play squirt sound when bloon is destroyed by escaping
      if (scene.sound && scene.sound.play) {
        scene.sound.play('squirt');
      }
      scene._escapedBloons.add(e);
    }
  }
  for (const e of scene.gameLogic.enemies) {
    if (!e) continue;
    // Game area: 1600px wide (minus 220px shop), 900px tall (minus 100px info bar)
    const outOfBounds = e.position.x < 0 || e.position.x > 1380 || e.position.y < 0 || e.position.y > 800;
    
    // Always call updateAnimation if sprite exists and bloon uses spritesheet
    if (e.spritesheet && scene.textures.exists(e.spritesheet) && e.frameCount > 1) {
      const multiplier = window.BLOON_SIZE_MULTIPLIER || 1;
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
      const multiplier = window.BLOON_SIZE_MULTIPLIER || 1;
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
          // Destroy boss health bar if present
          if (e._healthBar && typeof e._healthBar.destroy === 'function') {
            e._healthBar.destroy();
            e._healthBar = null;
          }
        }
      }
      continue;
    }
    // Fallback to colored circle - but still call updateAnimation for destroy animation
    if (e.frameCount > 1 && typeof e.updateAnimation === 'function' && !e.isActive) {
      // Bloon with destroy animation but no spritesheet texture available
      if (typeof e.updateAnimation === 'function') {
        e.updateAnimation(null, 16);  // Pass null for sprite, animation will handle it
      }
      continue;
    }
    if (e.isActive) {
      const multiplier = window.BLOON_SIZE_MULTIPLIER || 1;
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
  
  // Boss health bar is now managed by BossBloon itself as a persistent graphics object.
}
