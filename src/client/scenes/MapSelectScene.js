// Phaser loaded from CDN in index.html

class MapSelectScene extends Phaser.Scene {
  constructor() {
    super("MapSelectScene");
    this.mapsData = null;
  }

  preload() {
                // Load melon bloon spritesheet (3 frames, 208x201)
                this.load.spritesheet('melon_anim', '/ennemies/melon_anim.png', {
                  frameWidth: 208,
                  frameHeight: 201,
                  endFrame: 2
                });
            // Load orange bloon spritesheet (3 frames, 208x201)
            this.load.spritesheet('orange_anim', '/ennemies/orange_anim.png', {
              frameWidth: 208,
              frameHeight: 201,
              endFrame: 2
            });
        // Load orange bloon spritesheet (3 frames, 208x201)
        this.load.spritesheet('orange_anim', '/ennemies/orange_anim.png', {
          frameWidth: 208,
          frameHeight: 201,
          endFrame: 2
        });
    // Load bloon images
    this.load.image('bananas', '/ennemies/bananas.png');
    // Load banana bloon spritesheet (3 frames, 208x201)
    this.load.spritesheet('bananas_anim', '/ennemies/bananas_anim.png', {
      frameWidth: 208,
      frameHeight: 201,
      endFrame: 2
    });
      // Load cherry bloon spritesheet (3 frames, 208x201)
      this.load.spritesheet('cherries_anim', '/ennemies/cherries_anim.png', {
        frameWidth: 208,
        frameHeight: 201,
        endFrame: 2
      });
    // Load kiwi bloon spritesheet (3 frames, 208x201)
    this.load.spritesheet('kiwi_anim', '/ennemies/kiwi_anim.png', {
      frameWidth: 208,
      frameHeight: 201,
      endFrame: 2
    });
    // Load apple bloon spritesheet (3 frames, 208x201)
    this.load.spritesheet('apple_anim', '/ennemies/apple_anim.png', {
      frameWidth: 208,
      frameHeight: 201,
      endFrame: 2
    });
    this.load.json('maps', '/maps.json');
    this.load.image('splash2', '/splash/splash2.jpg');
    // Preload all map background images for previews
    const mapsData = this.cache && this.cache.json && this.cache.json.get('maps');
    const maps = mapsData?.maps || [];
    // If not available yet, load a default set (for first load)
    const previewBackgrounds = [
      '/maps/map1.png',
      '/maps/map2.png',
      '/maps/map3.png'
    ];
    // Try to load backgrounds from maps.json if available
    (maps.length ? maps.map(m => m.background) : previewBackgrounds).forEach(bg => {
      if (bg) this.load.image(bg, bg);
    });
  }

  create() {
    // No background image for menu select screen

    this.add.text(600, 100, "Select a Map", {
      font: "bold 60px Arial Black",
      fill: "#FF6B9D",
      stroke: "#FFD700",
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true }
    }).setOrigin(0.5);

    this.mapsData = this.cache.json.get('maps');
    const maps = this.mapsData?.maps || [];

    // Grid settings
    const gridCols = 2;
    const cellWidth = 180;
    const cellHeight = 180;
    // Center the grid horizontally (game width assumed 1200)
    const gridStartX = (1200 - (gridCols * cellWidth)) / 2 + cellWidth / 2;
    const gridStartY = 260;
    const previewSize = 110;

    maps.forEach((map, idx) => {
      const col = idx % gridCols;
      const row = Math.floor(idx / gridCols);
      const x = gridStartX + col * cellWidth;
      const y = gridStartY + row * cellHeight;

      // Preview image
      const bgKey = map.background;
      const preview = this.add.image(x, y, bgKey)
        .setDisplaySize(previewSize, previewSize)
        .setInteractive({ useHandCursor: true });

      // Map name below preview
      const label = this.add.text(x, y + previewSize / 2 + 14, map.name || `Map ${map.id}`, {
        font: "20px Arial",
        fill: "#fff",
        backgroundColor: "#222",
        padding: { x: 8, y: 3 }
      }).setOrigin(0.5);

      // Make both preview and label clickable
      const onSelect = () => {
        // Stop intro music if playing (ensure all instances are stopped)
        if (this.sound && this.sound.getAll) {
          this.sound.getAll('intro_music').forEach(snd => snd.stop());
        } else if (this.sound && this.sound.get('intro_music')) {
          this.sound.get('intro_music').stop();
        }
        // Start main game music if sound is on and not already playing
        // Try to get soundOn from previous scene if passed, else default to true
        let soundOn = true;
        if (this.scene.settings.data && typeof this.scene.settings.data.soundOn !== 'undefined') {
          soundOn = this.scene.settings.data.soundOn;
        }
        if (soundOn !== false && this.cache.audio.exists('main_game_music') && !this.sound.get('main_game_music')) {
          this.sound.play('main_game_music', { loop: true, volume: 0.7 });
        }
        const mapConfig = JSON.parse(JSON.stringify(map));
        this.scene.start("BalouneScene", { mapConfig });
      };
      preview.on("pointerdown", onSelect);
      label.on("pointerdown", onSelect);
    });
  }
}


export default MapSelectScene;
