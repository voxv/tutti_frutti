// Sound Toggle Button UI module
export function createSoundToggleButton(scene, x = 1350, y = 770) {
  if (!scene.textures.exists('sound_on') || !scene.textures.exists('sound_off')) return null;
  const button = scene.add.image(x, y, scene.soundOn ? 'sound_on' : 'sound_off')
    .setDisplaySize(50, 50)
    .setInteractive({ useHandCursor: true })
    .setDepth(99999);
  button.on('pointerdown', () => {
    scene.soundOn = !scene.soundOn;
    button.setTexture(scene.soundOn ? 'sound_on' : 'sound_off');
    if (scene.soundOn) {
      if (scene.cache.audio.exists('main_game_music')) {
        const allMusic = scene.sound.getAll('main_game_music');
        if (allMusic.length === 0 || allMusic.every(snd => !snd.isPlaying && !snd.isPaused)) {
          scene.sound.play('main_game_music', { loop: true, volume: 0.7 });
        } else {
          allMusic.forEach(snd => snd.resume());
        }
      }
    } else {
      scene.sound.getAll('main_game_music').forEach(snd => snd.pause());
    }
  });
  return button;
}
