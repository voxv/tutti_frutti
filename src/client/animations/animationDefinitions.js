
/**
 * Animation Definitions Module
 * Centralized location for all game animation definitions
 */

/**
 * Animation key constants
 */
export const ANIMATION_KEYS = {
  KNIFE_TOWER_IDLE: 'knife_tower_idle'
};

/**
 * Animation configuration objects
 * Defines sprite sheet keys, frame ranges, and playback settings
 */
export const ANIMATION_CONFIGS = {
  [ANIMATION_KEYS.KNIFE_TOWER_IDLE]: {
    spriteSheetKey: 'knife_tower_anim',
    frameStart: 0,
    frameEnd: 5,
    frameRate: 24,
    repeat: -1
  }
};

/**
 * Setup all animations for a Phaser scene
 * @param {Phaser.Scene} scene - The Phaser scene to add animations to
 * @param {Object} towerConfig - Tower configuration object (optional, to override animation config from tower.json)
 */
export function setupAnimations(scene, towerConfig, bloonsConfig) {
        // Add explode_anim animation for boulder/projectile destruction
        if (!scene.anims.exists('explode_anim')) {
          const frames = scene.anims.generateFrameNumbers('explode_anim', { start: 0, end: 5 });
          scene.anims.create({
            key: 'explode_anim',
            frames,
            frameRate: 16,
            repeat: 0
          });
        }
    // Ensure laser_anim animation exists for the laser projectile
    if (!scene.anims.exists('laser_anim')) {
      scene.anims.create({
        key: 'laser_anim',
        frames: scene.anims.generateFrameNumbers('laser_anim', { start: 0, end: 3 }),
        frameRate: 19,
        repeat: -1
      });
    }

    // Ensure laser_shooter_anim animation exists for the laser tower projectile (normal order)
    if (towerConfig && towerConfig.laser && towerConfig.laser.assets && towerConfig.laser.assets.placedImage && towerConfig.laser.assets.animation) {
      const anim = towerConfig.laser.assets.animation;
      const spriteSheetKey = 'laser_anim'; // This should match the key used in preload for the projectile
      if (!scene.anims.exists('laser_shooter_anim')) {
        scene.anims.create({
          key: 'laser_shooter_anim',
          frames: scene.anims.generateFrameNumbers(spriteSheetKey, {
            start: anim.frames?.start !== undefined ? anim.frames.start : 0,
            end: anim.frames?.end !== undefined ? anim.frames.end : 2
          }),
          frameRate: anim.frameRate || 10,
          repeat: anim.repeat !== undefined ? anim.repeat : -1
        });
      }
      // Also create laser_tower_idle animation for the placed tower sprite
      if (!scene.anims.exists('laser_tower_idle')) {
        scene.anims.create({
          key: 'laser_tower_idle',
          frames: scene.anims.generateFrameNumbers('laser_placed', {
            start: anim.frames?.start !== undefined ? anim.frames.start : 0,
            end: anim.frames?.end !== undefined ? anim.frames.end : 3
          }),
          frameRate: 5,
          repeat: anim.repeat !== undefined ? anim.repeat : -1
        });
      }
    }
  // Dynamically create animations for all towers with animation config
  if (towerConfig) {
    Object.entries(towerConfig).forEach(([towerKey, config]) => {
      if (config.assets && config.assets.animation && config.assets.placedImage) {
        const anim = config.assets.animation;
        const animKey = anim.key || `${towerKey}_idle`;
        // Use the spritesheet key as loaded in preload (e.g., `${towerKey}_placed`)
        const spriteSheetKey = `${towerKey}_placed`;
        // Only create if not already present
        if (!scene.anims.exists(animKey)) {
          try {
            const generatedFrames = scene.anims.generateFrameNumbers(spriteSheetKey, {
              start: anim.frames?.start !== undefined ? anim.frames.start : 0,
              end: anim.frames?.end !== undefined ? anim.frames.end : 0
            });
            scene.anims.create({
              key: animKey,
              frames: generatedFrames,
              frameRate: anim.frameRate || 12,
              repeat: anim.repeat !== undefined ? anim.repeat : 0
            });
          } catch (err) {
            // Silenced error: Failed to create animation
          }
        }
      }
    });
  }

  // Dynamically create animations for all bloons with spritesheets
  if (bloonsConfig && bloonsConfig.bloons) {
    Object.entries(bloonsConfig.bloons).forEach(([bloonKey, bloonData]) => {
      if (bloonData.spritesheet && bloonData.image && bloonData.frameCount > 1) {
        const animKey = `${bloonData.image}_anim`;
        if (!scene.anims.exists(animKey)) {
          scene.anims.create({
            key: animKey,
            frames: scene.anims.generateFrameNumbers(bloonData.image, {
              start: 0,
              end: (bloonData.frameCount - 1)
            }),
            frameRate: 12, // Default frame rate for bloons
            repeat: -1
          });
        }
      }
    });
  }
}

/**
 * Play an animation on a sprite
 * @param {Phaser.Physics.Sprite} sprite - The sprite to play animation on
 * @param {string} animationKey - The animation key to play
 */
export function playAnimation(sprite, animationKey) {
  if (sprite && !sprite.anims.isPlaying) {
    sprite.play(animationKey);
  }
}

/**
 * Stop animation on a sprite
 * @param {Phaser.Physics.Sprite} sprite - The sprite to stop animation on
 */
export function stopAnimation(sprite) {
  if (sprite && sprite.anims.isPlaying) {
    sprite.anims.stop();
  }
}

/**
 * Check if a sprite is playing a specific animation
 * @param {Phaser.Physics.Sprite} sprite - The sprite to check
 * @param {string} animationKey - The animation key to check for
 * @returns {boolean} True if the sprite is playing that animation
 */
export function isPlayingAnimation(sprite, animationKey) {
  return (
    sprite &&
    sprite.anims.isPlaying &&
    sprite.anims.currentAnim?.key === animationKey
  );
}
