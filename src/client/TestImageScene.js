import Phaser from "phaser";

export class TestImageScene extends Phaser.Scene {
  preload() {
    this.load.image('testBg', '/maps/map1.png');
  }
  create() {
    this.add.image(0, 0, 'testBg').setOrigin(0, 0).setDisplaySize(1200, 900);
    this.add.text(100, 100, 'TestImageScene loaded', { font: '32px Arial', fill: '#0f0' });
  }
}
