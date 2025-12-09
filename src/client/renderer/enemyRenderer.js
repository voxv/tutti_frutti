// src/client/renderer/enemyRenderer.js
// Handles rendering of enemies (bloons) for the game scene

export function renderEnemies(scene) {
  // Draw all active bloons/enemies
  if (!scene.gameLogic || !scene.gameLogic.enemies) return;
  if (!scene.enemyGraphics) {
    scene.enemyGraphics = scene.add.graphics();
    scene.enemyGraphics.setDepth(3500); // Ensure graphics are visible above other elements
    console.log('Created enemyGraphics with depth 3500');
  }
  scene.enemyGraphics.clear();
  // TEST: Draw a red rectangle at the top-left to verify graphics rendering
  scene.enemyGraphics.fillStyle(0xFF0000, 1);
  scene.enemyGraphics.fillRect(10, 10, 100, 30);
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
  
  // DEBUG: Log all enemies for boss detection
  console.log('ENEMY DEBUG:', scene.gameLogic.enemies.map(e => ({
    name: e && e.constructor && e.constructor.name,
    type: e && e.type,
    health: e && e.health,
    isActive: e && e.isActive,
    pos: e && e.position
  })));
  // Draw health bars for boss bloons AFTER all sprites are rendered
  for (const e of scene.gameLogic.enemies) {
    if (!e) continue;
    // Robust boss detection: works even if minified
    if ((
      (e.constructor && typeof e.constructor.name === 'string' && e.constructor.name === 'BossBloon') ||
      (e.type === 'boss') ||
      (e.health >= 2000 && e.size >= 100 && e.reward >= 100 && e.isActive)
    ) && e.isActive && e.health > 0) {
      const multiplier = window.BLOON_SIZE_MULTIPLIER || 1;
      const size = (e.size ?? 20) * multiplier;
      const barWidth = size * 1.5;
      const barHeight = 10;
      const barX = e.position.x - barWidth / 2;
      const barY = e.position.y - size + 5;
      // TEST: Draw a cyan rectangle at the boss health bar position
      scene.enemyGraphics.fillStyle(0x00FFFF, 1);
      scene.enemyGraphics.fillRect(barX, barY, barWidth, barHeight);
      console.log('TEST boss health bar position:', {barX, barY, barWidth, barHeight, bossPos: e.position});
      // Background (dark gray)
      scene.enemyGraphics.fillStyle(0x333333, 1);
      scene.enemyGraphics.fillRect(barX, barY, barWidth, barHeight);
      // Health bar (green)
      const healthPercent = Math.max(0, e.health / (e.maxHealth || 500)); // Use maxHealth from config
      scene.enemyGraphics.fillStyle(0x00FF00, 1);
      scene.enemyGraphics.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      // Border (white)
      scene.enemyGraphics.lineStyle(2, 0xFFFFFF, 1);
      scene.enemyGraphics.strokeRect(barX, barY, barWidth, barHeight);
    }
  }
}
