// Music management utility for BalouneScene

export function playMainMusic(scene) {
  if (scene.soundOn !== false && scene.cache.audio.exists('main_game_music')) {
    if (scene.sound.get('main_game_music')) {
      scene.sound.get('main_game_music').stop();
    }
    scene.sound.play('main_game_music', { loop: true, volume: 0.7 });
  }
}

export function stopMainMusic(scene) {
  if (scene.sound && scene.sound.getAll) {
    scene.sound.getAll('main_game_music').forEach(snd => snd.stop());
  } else if (scene.sound && scene.sound.get('main_game_music')) {
    scene.sound.get('main_game_music').stop();
  }
}

export function playBossMusic(scene) {
  // Stop main game music first
  stopMainMusic(scene);
  if (scene.sound && scene.sound.get('boss_music')) {
    scene.sound.get('boss_music').stop();
  }
  if (scene.soundOn !== false && scene.cache.audio.exists('boss_music')) {
    scene.sound.play('boss_music', { loop: true, volume: 0.8 });
  }
}

export function stopBossMusic(scene) {
  if (scene.sound && scene.sound.get('boss_music')) {
    scene.sound.get('boss_music').stop();
  }
}

export function playGameOverMusic(scene) {
  if (scene.cache.audio.exists('game_over_music')) {
    if (!scene.sound.get('game_over_music')) {
      scene.sound.play('game_over_music', { loop: false, volume: 0.8 });
    } else {
      scene.sound.get('game_over_music').play();
    }
  }
}

export function stopGameOverMusic(scene) {
  if (scene.sound && scene.sound.get('game_over_music')) {
    scene.sound.get('game_over_music').stop();
  }
}
