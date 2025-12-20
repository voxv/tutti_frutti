import Phaser from "phaser";
import { GAME_SCALE, GAME_WIDTH, GAME_HEIGHT } from "../utils/scaleConfig.js";

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

    // Add splash background (centered, scaled)
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'splash')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.15, "Tutti Frutti Tower Defense", {
      font: `bold ${Math.round(48 * GAME_SCALE)}px Arial Black`,
      fill: "#FF6B9D",
      stroke: "#FFD700",
      strokeThickness: Math.round(4 * GAME_SCALE),
      shadow: { offsetX: 3 * GAME_SCALE, offsetY: 3 * GAME_SCALE, color: '#000000', blur: 8 * GAME_SCALE, fill: true }
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

    const startButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, "Start Game", {
      font: `${Math.round(32 * GAME_SCALE)}px Arial`,
      fill: "#00ff00",
      backgroundColor: "#222",
      padding: { x: Math.round(20 * GAME_SCALE), y: Math.round(10 * GAME_SCALE) }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startButton.on("pointerdown", () => {
      // Do not stop intro music; let it continue into MapSelectScene
      this.scene.start("MapSelectScene");
    });
  }
}

export default IntroScene;
