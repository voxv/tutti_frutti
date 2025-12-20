import { Projectile } from "./Projectile.js";
import { GAME_SCALE } from "../../client/utils/scaleConfig.js";

export class ExplosionProjectile extends Projectile {
  constructor({ position, damage = 0, sourceTower = null }) {
    super({ position, direction: { x: 0, y: 0 }, speed: 0, damage, texture: null, target: null, hitRadius: 0, homing: false });
    this.sourceTower = sourceTower;
  }

  playExplosion(scene) {
    if (scene && scene.add && scene.anims) {
      const explosion = scene.add.sprite(this.position.x, this.position.y, 'explode_anim', 0)
        .setDisplaySize(100 * GAME_SCALE, 100 * GAME_SCALE)
        .setDepth(4000);
      if (scene.anims.exists('explode_anim')) {
        try {
          explosion.play('explode_anim');
          explosion.on('animationcomplete', () => {
            explosion.destroy();
          });
        } catch (err) {
          explosion.destroy();
        }
      } else {
        explosion.destroy();
      }
    }
    try {
      if (window.sceneRef && window.sceneRef.sound && window.sceneRef.sound.play) {
        window.sceneRef.sound.play('boom');
      }
    } catch (e) {
      // Silently ignore sound errors
    }
  }
}
