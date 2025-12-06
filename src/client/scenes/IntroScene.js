// Phaser is loaded globally from CDN in index.html
const Phaser = window.Phaser;

class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  preload() {
    this.load.image('splash', '/splash/splash.jpg');
    // Load intro music (WAV file)
    this.load.audio('intro_music', '/sounds/intro.wav');
  }

  create() {
    const maps = this.cache.json.get('maps')?.maps || [];

    // Add splash background (centered at 600, 300, no stretching)
    this.add.image(600, 300, 'splash');

    this.add.text(600, 150, "Tutti Frutti Tower Defense", {
      font: "bold 48px Arial Black",
      fill: "#FF6B9D",
      stroke: "#FFD700",
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true }
    }).setOrigin(0.5);


    // If coming from gameplay, play intro music immediately if not already playing and sound is on
    const soundOn = this.scene.settings.data && typeof this.scene.settings.data.soundOn !== 'undefined'
      ? this.scene.settings.data.soundOn
      : true;
    if (this.sound.get('intro_music')) {
      this.sound.get('intro_music').stop();
    }
    if (soundOn !== false && this.cache.audio.exists('intro_music')) {
      this.sound.play('intro_music', { loop: true, volume: 0.7 });
    }

    // Still set up user gesture fallback for first load (in case autoplay is blocked)
    let musicStarted = !!this.sound.get('intro_music');
    const startMusic = () => {
      if (!musicStarted && this.cache.audio.exists('intro_music') && !this.sound.get('intro_music')) {
        this.sound.play('intro_music', { loop: true, volume: 0.7 });
        musicStarted = true;
        this.input.off('pointerdown', startMusic);
      }
    };
    this.input.on('pointerdown', startMusic);

    const startButton = this.add.text(600, 350, "Start Game", {
      font: "32px Arial",
      fill: "#00ff00",
      backgroundColor: "#222",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startButton.on("pointerdown", () => {
      // Do not stop intro music; let it continue into MapSelectScene
      this.scene.start("MapSelectScene");
    });
  }
}

export default IntroScene;
