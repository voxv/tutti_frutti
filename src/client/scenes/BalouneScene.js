import Phaser from "phaser";
import { Baloune } from "../../game/Baloune.js";
import { showUpgradeUI, refreshUpgradeUIIfVisible } from "../ui/upgradeUI.js";
import { spawnWave, parseWaveString } from "../logic/waveLogic.js";
import { drawShopUI, refreshShopAvailability } from "../ui/shopUI.js";
import { drawInfoBarUI, updateLifeBar } from "../ui/infoBarUI.js";
import { createTargetingButtons, updateTargetingButtons } from "../ui/targetingUI.js";
import { AOETower } from "../../game/towers/AOETower.js";
// Use global configs from main.js, or fallback to imported versions for development
const towerConfig = window.towerConfig || (await import("../../game/towers/tower.json")).default;
const bloonsConfig = window.bloonsConfig || (await import("../../game/enemies/bloons.json")).default;
import { SniperTower } from "../../game/towers/SniperTower.js";
import { addSpikeProjectile } from "../../game/towers/spikeProjectile.js";
import * as towerPlacement from "../logic/towerPlacement.js";
import { renderEnemies } from "../renderer/enemyRenderer.js";
import { showGameOverPopup } from "../ui/gameOverUI.js";
import { showWinGamePopup } from "../ui/winGameUI.js";
import { showRangeCircle, hideRangeCircle } from "../logic/towerPlacement.js";
import * as sceneUtils from "../utils/sceneUtils.js";
import { setupTowerClickHandler, setupStartWaveButtonHandler, setupGameFieldClickHandler } from "../input/inputHandlers.js";
import { setupGameStateMachine, GAME_PHASES, transitionGamePhase } from "../state/gameStateManager.js";
import { setupAnimations, ANIMATION_KEYS, isPlayingAnimation } from "../animations/animationDefinitions.js";


// DEV: Set this to start from a specific wave for testing
const DEV_START_WAVE = 1 // Set to 1 for normal, or e.g. 5 to start from wave 5

// DEV: Set this to control the overall size of all bloons (default 1)
const BLOON_SIZE_MULTIPLIER = 1.1;

// DEV: Set this to control the overall size of all placed towers (default 1)
const PLACED_TOWER_SIZE_MULTIPLIER = 1.2;

// DEV: Set this to control the overall speed of all bloons (default 1)
const BLOON_SPEED_MULTIPLIER = 1.2;

// DEV: Set the starting gold amount for the player
const STARTING_GOLD = 650;

// Ensure the global variables are set from here if not already set
if (typeof window !== 'undefined') {
  window.BLOON_SIZE_MULTIPLIER = BLOON_SIZE_MULTIPLIER;
  window.BLOON_SPEED_MULTIPLIER = BLOON_SPEED_MULTIPLIER;
}

class BalouneScene extends Phaser.Scene {
  previousGoldAmount = null;
  // Call this whenever gold changes to refresh upgrade UI
  refreshUpgradeUIIfVisible() {
    refreshUpgradeUIIfVisible(this, towerConfig);
  }
  showUpgradeUI(placedTower) {
    // Clear the range circle from any previously selected tower
    if (this.activeTowerRangeCircle && this.activeTowerRangeCircle.destroy) {
      this.activeTowerRangeCircle.destroy();
      this.activeTowerRangeCircle = null;
    }
    showUpgradeUI(this, placedTower, towerConfig);
  }

  constructor() {
    super("BalouneScene");
    this.gameLogic = null;
    this.waveInProgress = false;
    this.gamePhase = "buying";
    this.waveNumber = 1;
    this.currentWaveIndex = 0;
    this.startWaveButton = null;
    this.waveText = null;
    this.waveInProgress = false;
    // Ensure targeting UI update function is available to input handlers
    this.updateTargetingButtons = updateTargetingButtons;
  }



  update() {
    // Don't update game logic if game over is shown
    if (!this._gameOverShown && this.gameLogic) this.gameLogic.update(1 / 60);

    // Stop all SpikeTowers from firing if not in SPAWNING phase
    if (this.gameLogic && Array.isArray(this.gameLogic.towers)) {
      const isSpawning = this.gameStateMachine && this.gameStateMachine.isInPhase && this.gameStateMachine.isInPhase(GAME_PHASES.SPAWNING);
      for (const tower of this.gameLogic.towers) {
        if (tower && tower.constructor && tower.constructor.name === 'SpikeTower') {
          tower._spikeShootingDisabled = !isSpawning;
        }
      }
      // Debug: Print all tower types and _placedSprite/anims presence
      for (const tower of this.gameLogic.towers) {
        // ...existing code...
      }
      // Debug: Log animation state for all BirdTowers
      for (const tower of this.gameLogic.towers) {
        if (tower && tower.towerType === 'bird' && tower._placedSprite && tower._placedSprite.anims) {
          // Infinity (figure-eight) flight motion is now handled in BirdTower.js
        }
      }
    }
    // --- Spike projectile collision logic ---
    if (this.spikeProjectiles && this.gameLogic && Array.isArray(this.gameLogic.enemies)) {
      for (const spike of [...this.spikeProjectiles]) { // clone array in case of removal
        if (!spike.active) continue;
        for (const bloon of this.gameLogic.enemies) {
          if (!bloon || !bloon.isActive) continue;
          // Use hitRadius for collision
          const dx = spike.x - bloon.position.x;
          const dy = spike.y - bloon.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (spike.hitRadius || 24)) {
            if (!spike._hasHit.has(bloon)) {
              // Apply damage (assume bloon has takeDamage method)
              let destroyed = false;
              if (typeof bloon.takeDamage === 'function') {
                const prevHealth = bloon.health ?? bloon.damage;
                bloon.takeDamage(spike.damage);
                // If bloon is destroyed after taking damage
                if (!bloon.isActive || (typeof bloon.health === 'number' && bloon.health <= 0) || (typeof bloon.damage === 'number' && bloon.damage <= 0)) {
                  destroyed = true;
                }
              } else if (typeof bloon.damage === 'number') {
                bloon.damage -= spike.damage;
                if (bloon.damage <= 0 && typeof bloon.destroy === 'function') {
                  bloon.destroy();
                  destroyed = true;
                }
              }
              spike._hasHit.add(bloon);
              // Fat spike logic: decrement remainingPops if present
              if (typeof spike.remainingPops === 'number') {
                spike.remainingPops--;
                if (spike.remainingPops <= 0) {
                  spike.active = false;
                  spike.destroy();
                  if (this.spikeProjectiles) {
                    const idx = this.spikeProjectiles.indexOf(spike);
                    if (idx !== -1) this.spikeProjectiles.splice(idx, 1);
                  }
                  break; // Stop checking other bloons for this spike
                }
              } else if (destroyed) {
                spike.active = false;
                spike.destroy();
                if (this.spikeProjectiles) {
                  const idx = this.spikeProjectiles.indexOf(spike);
                  if (idx !== -1) this.spikeProjectiles.splice(idx, 1);
                }
                break; // Stop checking other bloons for this spike
              }
            }
          }
        }
      }
    }
    renderEnemies(this);
    // Refresh upgrade UI only when gold changes
    if (this.upgradeUI && this.selectedTowerForUpgradeUI) {
      if (this.previousGoldAmount === null) this.previousGoldAmount = this.goldAmount;
      if (this.previousGoldAmount !== this.goldAmount) {
        this.refreshUpgradeUIIfVisible();
        this.previousGoldAmount = this.goldAmount;
      }
    } else {
      this.previousGoldAmount = this.goldAmount;
    }
    // Main wave end logic
    if (
      this.gameStateMachine.isInPhase(GAME_PHASES.SPAWNING) &&
      this.gameLogic.waveSpawningComplete &&
      this.gameLogic.enemies.length === 0 &&
      this.gameLogic.currentWaveEnemies.length === 0 &&
      this.gameLogic.totalBloonsScheduled > 0 &&
      !this._waveEndTriggered // Only trigger once per wave
    ) {
      this._waveEndTriggered = true;
      
      // Check if wave 50 (last wave) is complete
      if (this.waveNumber === 50) {
        // Stop all instances of main game music if playing
        if (this.sound && this.sound.getAll) {
          this.sound.getAll('main_game_music').forEach(snd => snd.stop());
        } else if (this.sound && this.sound.get('main_game_music')) {
          this.sound.get('main_game_music').stop();
        }
        // Show win game popup
        this._gameOverShown = true;
        showWinGamePopup(this, {
          onReplay: () => {
            this._gameOverShown = false;
            // Stop game over music if playing
            if (this.sound && this.sound.get('game_over_music')) {
              this.sound.get('game_over_music').stop();
            }
            if (this.sound && this.sound.getAll) {
              this.sound.getAll('main_game_music').forEach(snd => snd.stop());
            }
            // Restart main game music if sound is on
            if (this.soundOn !== false && this.cache.audio.exists('main_game_music')) {
              if (this.sound.get('main_game_music')) {
                this.sound.get('main_game_music').stop();
              }
              this.sound.play('main_game_music', { loop: true, volume: 0.7 });
            }
            window.sceneRef = this;
            // Hide range circle before anything else
            if (typeof hideRangeCircle === 'function') hideRangeCircle(this);
            // Also clean up drag range circle if it exists
            if (this.dragRangeCircle && typeof this.dragRangeCircle.destroy === 'function') {
              this.dragRangeCircle.destroy();
              this.dragRangeCircle = null;
            }
            // Destroy all graphics objects (range circles, etc)
            if (this.children && this.children.list) {
              const graphicsToDestroy = this.children.list.filter(child => child && child.type === 'Graphics');
              graphicsToDestroy.forEach(graphic => {
                if (typeof graphic.destroy === 'function') {
                  graphic.destroy();
                }
              });
            }
            // Destroy upgrade UI and selected tower state
            if (this.upgradeUI && typeof this.upgradeUI.destroy === 'function') {
              this.upgradeUI.destroy();
              this.upgradeUI = null;
            }
            if (this.upgradeTooltip && typeof this.upgradeTooltip.destroy === 'function') {
              this.upgradeTooltip.destroy();
              this.upgradeTooltip = null;
            }
            this.selectedTowerForUpgradeUI = null;
            // Hide targeting buttons
            if (this.targetingButtons && Array.isArray(this.targetingButtons)) {
              if (typeof window !== 'undefined' && window.targetingUI && typeof window.targetingUI.hideTargetingButtons === 'function') {
                window.targetingUI.hideTargetingButtons(this.targetingButtons);
              } else if (this.targetingButtons.forEach) {
                this.targetingButtons.forEach(btn => btn.setVisible(false));
                if (this.targetingButtons.targetingLabel) this.targetingButtons.targetingLabel.setVisible(false);
              }
            }
            // Reset gold to starting amount
            this.goldAmount = STARTING_GOLD;
            if (this.goldText) this.goldText.setText(String(this.goldAmount));
            // Reset game state to wave 1
            this.playerLives = this.maxPlayerLives;
            this.waveNumber = 1;
            this.currentWaveIndex = 0;
            // Reset game state machine to buying phase
            this.gameStateMachine.reset(GAME_PHASES.BUYING);
            // Reset game logic state
            sceneUtils.resetGameLogicState(this.gameLogic);
            // Remove placed tower sprites
            sceneUtils.removePlacedTowerSprites(this, this.gameLogic);
            // Remove all projectiles and spikes
            sceneUtils.removeAllProjectiles(this);
            if (this.spikeProjectiles && Array.isArray(this.spikeProjectiles)) {
              for (const spike of this.spikeProjectiles) {
                if (spike && typeof spike.destroy === 'function') {
                  spike.destroy();
                }
              }
              this.spikeProjectiles = [];
            }
            // Remove all fruit sprites
            sceneUtils.removeFruitSprites(this);
            // Show game elements again
            if (this.enemyGraphics) this.enemyGraphics.setVisible(true);
            
            // Update wave text display
            if (this.waveText) {
              this.waveText.setText(`Wave: ${this.waveNumber}`);
            }
            
            // Destroy old button if it exists and recreate it
            if (this.startWaveButton) {
              this.startWaveButton.destroy();
              this.startWaveButton = null;
            }
            const gameWidth = 1600;
            const shopWidth = 220;
            const infoBarHeight = 100;
            this.startWaveButton = this.add.text(
              gameWidth - shopWidth / 2,
              this.sys.game.config.height - infoBarHeight / 2,
              "Start Wave",
              {
                font: "28px Arial",
                fill: "#00ff00",
                backgroundColor: "#222",
                padding: { x: 20, y: 10 }
              }
            ).setOrigin(0.5).setInteractive({ useHandCursor: true });
            this.startWaveButton.setDepth(1000);
            this.startWaveButton.input.enabled = true;
            this.startWaveButton.on('pointerdown', () => {
              if (!this.gameStateMachine.isInPhase(GAME_PHASES.BUYING) || !this.startWaveButton.input.enabled) return;
              transitionGamePhase(this, GAME_PHASES.SPAWNING);
              this.startWaveButton.setStyle({ fill: "#888" });
              this.startWaveButton.disableInteractive();
              this._waveCompletionBonusAwarded = false;
              this._waveEndTriggered = false;
              spawnWave(this, this.gameLogic, this.currentWaveIndex);
              this.currentWaveIndex++;
            });
            
            // Redraw the info bar and shop UI backgrounds after replay
            // Destroy old UI elements first
            if (this.infoBar) this.infoBar.destroy();
            if (this.goldText) this.goldText.destroy();
            if (this.lifeBar) this.lifeBar.destroy();
            if (this.lifeBarBg) this.lifeBarBg.destroy();
            if (this.lifeText) this.lifeText.destroy();
            if (this.heartImage) this.heartImage.destroy();
            if (this.nuggetImage) this.nuggetImage.destroy();
            drawInfoBarUI(this, gameWidth, this.sys.game.config.height, shopWidth, infoBarHeight);
            // Update life bar to show full health after UI is recreated
            this._updateLifeBar();
            if (this.shopUI) this.shopUI.destroy();
            if (this.shopGrid) {
              this.shopGrid.destroy();
              this.shopGrid = null;
            }
            drawShopUI(this, gameWidth, this.sys.game.config.height, shopWidth, infoBarHeight, towerConfig);

            // Recreate the Wave: X label in the info bar
            if (this.waveText) {
              this.waveText.destroy();
              this.waveText = null;
            }
            const startWaveBtnX = gameWidth - shopWidth / 2;
            const waveTextX = startWaveBtnX - 200;
            this.waveText = this.add.text(waveTextX, this.sys.game.config.height - infoBarHeight / 2, `Wave: ${this.waveNumber}`, {
              font: "20px Arial",
              fill: "#fff"
            }).setOrigin(0, 0.5);
          },
          onQuit: () => {
            this._gameOverShown = false;
            // Hide range circles before anything else
            if (typeof hideRangeCircle === 'function') hideRangeCircle(this);
            // Also clean up drag range circle if it exists
            if (this.dragRangeCircle && typeof this.dragRangeCircle.destroy === 'function') {
              this.dragRangeCircle.destroy();
              this.dragRangeCircle = null;
            }
            // Stop game over music if playing
            if (this.sound && this.sound.get('game_over_music')) {
              this.sound.get('game_over_music').stop();
            }
            // Completely clear the scene before leaving
            if (this.children && this.children.list) {
              const allChildren = [...this.children.list];
              allChildren.forEach(child => {
                if (child && typeof child.destroy === 'function') {
                  child.destroy();
                }
              });
            }
            // Stop this scene and go to start screen
            this.scene.stop();
            this.scene.start('IntroScene');
          }
        });
        return;
      }
      
      // Normal wave end (not wave 50)
      this.time.delayedCall(200, () => {
        // Remove all spike projectiles
        if (this.spikeProjectiles) {
          for (const spike of [...this.spikeProjectiles]) {
            spike.active = false;
            spike.destroy();
          }
          this.spikeProjectiles = [];
        }
        // Award 100 gold for completing the wave (only once)
        transitionGamePhase(this, GAME_PHASES.BUYING);
        if (!this._waveCompletionBonusAwarded) {
          this.goldAmount += 100;
          if (this.goldText) {
            this.goldText.setText(String(this.goldAmount));
          }
          if (typeof this._refreshShopAvailability === 'function') {
            this._refreshShopAvailability();
          }
          this._waveCompletionBonusAwarded = true;
        }
        // Increment wave number and update UI immediately
        this.waveNumber++;
        if (this.waveText) {
          this.waveText.setText(`Wave: ${this.waveNumber}`);
        }
        if (this.startWaveButton) {
          this.startWaveButton.destroy();
        }
        const gameWidth = 1600;
        const shopWidth = 220;
        const infoBarHeight = 100;
        this.startWaveButton = this.add.text(
          gameWidth - shopWidth / 2,
          this.sys.game.config.height - infoBarHeight / 2,
          "Start Wave",
          {
            font: "28px Arial",
            fill: "#00ff00",
            backgroundColor: "#222",
            padding: { x: 20, y: 10 }
          }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true });
        this.startWaveButton.setDepth(1000);
        this.startWaveButton.on("pointerdown", () => {
          if (!this.gameStateMachine.isInPhase(GAME_PHASES.BUYING) || !this.startWaveButton.input.enabled) return;
          transitionGamePhase(this, GAME_PHASES.SPAWNING);
          this.startWaveButton.setStyle({ fill: "#888" });
          this.startWaveButton.disableInteractive();
          this._waveCompletionBonusAwarded = false;  // Reset flag for new wave
          this._waveEndTriggered = false;  // Reset wave end trigger for new wave
          spawnWave(this, this.gameLogic, this.currentWaveIndex);
          this.currentWaveIndex++;
        });
      });
    }

    // Animate knife tower when any bloon is in range
    if (this.gameLogic && Array.isArray(this.gameLogic.towers)) {
      for (const tower of this.gameLogic.towers) {
        // Cannon no longer rotates to face bloons
        // Knife tower animation logic
        if (tower && tower.type === 'knife' && tower._placedSprite) {
          // Check up to 2 enemies in range
          let bloonsInRange = this.gameLogic.enemies && this.gameLogic.enemies.filter(
            enemy => enemy && enemy.isActive && tower.isInRange && tower.isInRange(enemy)
          );
          if (bloonsInRange && bloonsInRange.length > 1) {
            bloonsInRange = bloonsInRange.slice(0, 2);
          }
          if (bloonsInRange && bloonsInRange.length > 0) {
            // Get animation key from tower config
            const knifeAnimKey = towerConfig.knife?.assets?.animation?.key || ANIMATION_KEYS.KNIFE_TOWER_IDLE;
            // Play sound only once per fire (use tower's lastShotTime to throttle)
            const currentTime = Date.now() / 1000;
            if (currentTime - tower.lastShotTime < 0.05 && !tower._soundPlayedThisShot) {
              if (this.sound && this.sound.play) {
                this.sound.play('squirt');
                tower._soundPlayedThisShot = true;
              }
            } else if (currentTime - tower.lastShotTime >= 0.05) {
              tower._soundPlayedThisShot = false;
            }
            // Skip animation if storm_spin is active (rotation handles visual feedback)
            if (!tower._stormSpinActive) {
              // Only play animation when tower fires
              if (!isPlayingAnimation(tower._placedSprite, knifeAnimKey)) {
                tower._placedSprite.play(knifeAnimKey, true);
              }
            }
            // (Rotation removed; knife no longer spins while attacking)
            tower._placedSprite._waitForAnimEnd = false;
          } else {
            // Wait for animation to finish before stopping
            if (tower._placedSprite.anims.isPlaying) {
              const anim = tower._placedSprite.anims.currentAnim;
              const frameCount = anim ? anim.frames.length : 6;
              const currentFrame = tower._placedSprite.frame.name || 0;
              if (currentFrame < frameCount - 1) {
                // Let animation finish naturally
                tower._placedSprite._waitForAnimEnd = true;
              } else {
                // Animation finished, stop and reset
                tower._placedSprite.anims.stop();
                tower._placedSprite.setFrame(0);
                tower._placedSprite._waitForAnimEnd = false;
              }
            }
            // (Rotation reset removed; knife no longer spins)
          }
        }
      }
    }
  }
  preload() {
        // Load sound toggle button images
        this.load.image('sound_on', '/divers/sound.png');
        this.load.image('sound_off', '/divers/no_sound.png');
        // Load main game music
        this.load.audio('main_game_music', '/sounds/main_game.mp3');
        // Load game over music
        this.load.audio('game_over_music', '/sounds/game_over.mp3');
        this.load.audio('win', 'sounds/win.mp3');
    // Load explode_anim spritesheet for projectile destruction
    // 1477px / 7 frames = ~211px per frame
    this.load.spritesheet('explode_anim', 'towers/explode_anim.png', { frameWidth: 211, frameHeight: 202 }); // 1477/7=211
    // Preload laser projectile spritesheet
    this.load.spritesheet('laser_anim', '/towers/projectiles/laser_anim2.png', { frameWidth: 195, frameHeight: 190 });
    // Preload bzz sound for laser tower
    this.load.audio('bzz', '/sounds/bzz.wav');
    // Preload boom sound for explosions
    this.load.audio('boom', '/sounds/boom.wav');
    // Load tower images for shop using tower config
    Object.entries(towerConfig).forEach(([key, config]) => {
      if (config.assets?.shopImage) {
        // Use towerType as key (matches drawShopUI expectations)
        const keyName = config.towerType || key;
        this.load.image(keyName, config.assets.shopImage);
      }
      // Load placed image as spritesheet if animation config exists
      if (config.assets?.placedImage && config.assets?.animation) {
        this.load.spritesheet(`${key}_placed`, config.assets.placedImage, {
          frameWidth: config.assets.animation.frameWidth,
          frameHeight: config.assets.animation.frameHeight
        });
      } else if (config.assets?.placedImage) {
        this.load.image(`${key}_placed`, config.assets.placedImage);
      }
      if (config.assets?.projectile) {
        this.load.image(`${key}_projectile`, config.assets.projectile);
      }
    });
    // Load static tower images (legacy)
    this.load.image('tower_1', '/towers/tower_1.png');
    // Load boulder image for cannon projectiles
    this.load.image('boulder', '/towers/projectiles/boulder.png');
    // Load sniper projectile image
    this.load.image('sniper_projectile', '/towers/projectiles/sniper_projectile.png');
    // Load squirt sound for bloon destruction
    this.load.audio('squirt', '/sounds/squirt.wav');
    // Load nugget image for gold display
    this.load.image('nugget', '/divers/nugget.png');
    // Load heart image for life bar
    this.load.image('heart', '/divers/heart.png');
    // Load map background image if specified
    let bgKey = null;
    let bgPath = null;
    if (this.scene.settings.data && this.scene.settings.data.mapConfig && this.scene.settings.data.mapConfig.background) {
      bgKey = `mapBg_${this.scene.settings.data.mapConfig.id}`;
      bgPath = this.scene.settings.data.mapConfig.background;
    }
    // Always load the image if key and path are set
    if (bgKey && bgPath) {
      if (this.textures.exists(bgKey)) {
        this.textures.remove(bgKey);
      }
      this.load.image(bgKey, bgPath);
    }
    // Load knife tower animation frames for placed towers
    this.load.spritesheet('knife_tower_anim', '/towers/knife_tower_anim.png', { frameWidth: 200, frameHeight: 200 });
    // Dynamically load bloon spritesheets using config
    if (bloonsConfig && bloonsConfig.bloons) {
      Object.entries(bloonsConfig.bloons).forEach(([bloonKey, bloonData]) => {
        if (bloonData.spritesheet && bloonData.image && bloonData.frameWidth && bloonData.frameHeight) {
          // Compose the path based on image name (assumes convention)
          const imageKey = bloonData.image;
          const imagePath = `/ennemies/${imageKey}.png`;
          this.load.spritesheet(imageKey, imagePath, {
            frameWidth: bloonData.frameWidth,
            frameHeight: bloonData.frameHeight
          });
        }
      });
      // Also load static images for bloons that are not spritesheets
      Object.entries(bloonsConfig.bloons).forEach(([bloonKey, bloonData]) => {
        if (
          !bloonData.spritesheet &&
          bloonData.image &&
          !this.textures.exists(bloonData.image)
        ) {
          const imagePath = `/ennemies/${bloonData.image}.png`;
          this.load.image(bloonData.image, imagePath);
        }
      });
    }
    // Fallback: load cannon_projectile as boulder
    this.load.image('cannon_projectile', '/towers/projectiles/boulder.png');
  }

  create(data) {
        // --- Sound Toggle Button ---
        // Use the same values for gameWidth, shopWidth, infoBarHeight as elsewhere in create()
        // Declare them only once at the top of create()
        // --- Robust Sound Toggle Button ---
        // Use dynamic placement and very high depth
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        const shopWidth = 220;
        const infoBarHeight = 100;
        // Set soundOn from previous scene if passed
        this.soundOn = (data && typeof data.soundOn !== 'undefined') ? data.soundOn : true;
        // Ensure images are loaded before creating the button
        const soundOnLoaded = this.textures.exists('sound_on');
        const soundOffLoaded = this.textures.exists('sound_off');

    // Stop intro music if it's playing from previous scenes (ensure all instances are stopped)
    if (this.sound && this.sound.getAll) {
      this.sound.getAll('intro_music').forEach(snd => snd.stop());
    } else if (this.sound && this.sound.get('intro_music')) {
      this.sound.get('intro_music').stop();
    }
    // Always play main game music if sound is on
    if (this.soundOn !== false && this.cache.audio.exists('main_game_music')) {
      if (this.sound.get('main_game_music')) {
        this.sound.get('main_game_music').stop();
      }
      this.sound.play('main_game_music', { loop: true, volume: 0.7 });
    } else if (this.cache.audio.exists('main_game_music')) {
      // Ensure no music is playing if sound is off
      this.sound.getAll('main_game_music').forEach(snd => snd.stop());
    }
        // Remove lingering BirdTower selection circle if present
        if (this._birdSelectCircle) {
          this._birdSelectCircle.destroy();
          this._birdSelectCircle = null;
        }
    // CRITICAL: Destroy all existing game objects before setting up new game
    // This prevents leftover UI elements (like game over popup) from previous games
    this._createCallCount++;
    
    // Clear all display objects - check if any graphics are lingering
    if (this.sys.displayList && this.sys.displayList.children) {
      const displayChildren = [...this.sys.displayList.children];
      displayChildren.forEach(child => {
        if (child && typeof child.destroy === 'function') {
          child.destroy();
        }
      });
    }
    
    if (this.children && this.children.list) {
      const childrenToDestroy = [...this.children.list]; // Clone array to avoid modification during iteration
      childrenToDestroy.forEach(child => {
        if (child && typeof child.destroy === 'function') {
          child.destroy();
        }
      });
    }
    
    // Also clear graphics objects explicitly (but preserve mainArea and enemyGraphics which are recreated below)
    if (this.mainArea && typeof this.mainArea.destroy === 'function') {
      this.mainArea.destroy();
      this.mainArea = null;
    }
    if (this.enemyGraphics && typeof this.enemyGraphics.destroy === 'function') {
      this.enemyGraphics.destroy();
      this.enemyGraphics = null;
    }
    
    // Reset range circle references
    this.activeTowerRangeCircle = null;
    this.dragRangeCircle = null;
    
    window.sceneRef = this;
    window.bloonsConfig = bloonsConfig;
    // Make imported towerConfig available on the scene for tower placement
    this.addSpikeProjectile = (x, y, damage) => addSpikeProjectile(this, x, y, damage);
    this.towerConfig = towerConfig;
    // Always reset gamePhase and wave state
    this.gamePhase = GAME_PHASES.BUYING;
    this.waveNumber = DEV_START_WAVE;
    this.currentWaveIndex = DEV_START_WAVE - 1;
    this._gameOverShown = false;
    
    // Reset UI state variables
    this.selectedTowerForUpgradeUI = null;
    this.upgradeUI = null;
    this.upgradeTooltip = null;

    this.goldAmount = STARTING_GOLD;
    
    // Initialize player lives BEFORE calling drawInfoBarUI
    this.playerLives = 100;
    this.maxPlayerLives = 100;
    
    // Setup game state machine
    setupGameStateMachine(this, GAME_PHASES.BUYING);
    
    // Setup all game animations (pass bloonsConfig for dynamic bloon animations)
    setupAnimations(this, towerConfig, bloonsConfig);
    
    // const gameWidth = 1600;
    // const gameHeight = 900;
    // const shopWidth = 220;
    // const infoBarHeight = 100;

    // Use mapConfig from data
    const mapConfig = data?.mapConfig;
    if (!mapConfig) {
      this.add.text(600, 400, "Map config missing!", { font: "32px Arial", fill: "#f00" }).setOrigin(0.5);
      return;
    }
    // Convert controlPoints to Phaser.Vector2 if needed
    const controlPoints = mapConfig.controlPoints.map(pt =>
      pt instanceof Phaser.Math.Vector2 ? pt : new Phaser.Math.Vector2(pt.x, pt.y)
    );
    this.spline = new Phaser.Curves.Spline(controlPoints);
    // Set pathPoints for use by SpikeTower (as plain {x, y} objects)
    this.pathPoints = controlPoints.map(pt => ({ x: pt.x, y: pt.y }));
    const testMap = {
      paths: [
        { spline: this.spline, waypoints: controlPoints }
      ],
      towerSpots: mapConfig.towerSpots || [],
      noBuildZones: mapConfig.noBuildZones || []
    };
    // Create the logical game (engine-side)
    this.gameLogic = new Baloune(testMap);

    // Draw background image first if present
    let hasBgImage = false;
    if (mapConfig.background) {
      const bgKey = `mapBg_${mapConfig.id}`;
      if (this.textures.exists(bgKey)) {
        this.bgImage = this.add.image(0, 0, bgKey)
          .setOrigin(0, 0)
          .setDisplaySize(gameWidth - shopWidth, gameHeight - infoBarHeight)
          .setAlpha(1)
          .setDepth(0);
        hasBgImage = true;
      } else {
        console.error('BalouneScene create: Background texture not found:', bgKey, 'path:', mapConfig.background);
        // Try to load the image again and restart scene when loaded
        this.load.image(bgKey, mapConfig.background);
        this.load.once('complete', () => {
          if (this.textures.exists(bgKey)) {
            this.scene.restart({ mapConfig, soundOn: this.soundOn });
          } else {
            this.add.text(20, 20, `Background image NOT loaded: ${mapConfig.background}`, { font: '20px Arial', fill: '#f00' }).setDepth(10000);
          }
        });
        this.load.start();
        this.add.text(20, 50, `Background image missing or not loaded yet: ${mapConfig.background}`, { font: '20px Arial', fill: '#ff0' }).setDepth(10001);
      }
    }
    // Draw mainArea after bgImage, only if no image
    this.mainArea = this.add.graphics();
    this.mainArea.fillStyle(0x000000, hasBgImage ? 0 : 1);
    this.mainArea.fillRect(0, 0, gameWidth - shopWidth, gameHeight - infoBarHeight);
    this.mainArea.setDepth(1);

    // Ensure enemyGraphics is created after mainArea and above it
    this.enemyGraphics = this.add.graphics();
    this.enemyGraphics.setDepth(20);
    this.enemyGraphics.setVisible(true);

    // Draw the shop UI using the modular function
    drawShopUI(this, gameWidth, gameHeight, shopWidth, infoBarHeight, towerConfig);

        // Place tower at location - dynamically load and instantiate based on towerType
        this._placeTowerAt = async function(x, y, towerType, price) {
          if (this.goldAmount < price) return;
          
          // Find which tower key has this towerType
          const towerKey = Object.keys(towerConfig).find(key => towerConfig[key].towerType === towerType);
          if (!towerKey) {
            console.error(`Unknown tower type: ${towerType}`);
            return;
          }
          
          const config = towerConfig[towerKey];
          const className = config.class;
          
          try {
            // Dynamically import the tower class
            const module = await import(`../../game/towers/${className}.js`);
            const TowerClass = module[className];

            if (!TowerClass) {
              throw new Error(`${className} not found in module`);
            }

            // Place the tower on scene
            const towerInst = TowerClass.placeOnScene(this, x, y);
            // Apply global placed tower size multiplier
            if (towerInst && towerInst._placedSprite && typeof towerInst._placedSprite.setScale === 'function') {
              // Keep relative scale, but multiply by global multiplier
              const currentScaleX = towerInst._placedSprite.scaleX || 1;
              const currentScaleY = towerInst._placedSprite.scaleY || 1;
              towerInst._placedSprite.setScale(currentScaleX * PLACED_TOWER_SIZE_MULTIPLIER, currentScaleY * PLACED_TOWER_SIZE_MULTIPLIER);
            }
            // Ensure BirdTower has correct towerType and _pathCenter
            if (towerType === 'bird') {
              towerInst.towerType = 'bird';
              if (!towerInst._pathCenter) {
                towerInst._pathCenter = { x, y };
              }
            }
            // Add to towers array after sprite is linked
            this.gameLogic.towers.push(towerInst);
            const placedTower = towerInst._placedSprite;
            // Deselect previous tower and select the new one
            if (typeof window !== 'undefined' && window.inputHandlers && typeof window.inputHandlers.deselectTower === 'function') {
              window.inputHandlers.deselectTower(this);
            } else if (typeof this.deselectTower === 'function') {
              this.deselectTower();
            } else {
              this.selectedTowerForUpgradeUI = null;
            }
            // Select the newly placed tower for upgrade UI
            this.selectedTowerForUpgradeUI = placedTower;
            if (typeof this.showUpgradeUI === 'function') {
              this.showUpgradeUI(placedTower);
            }
            
            // Initialize targeting priority on both sprite and logic tower
            sceneUtils.initializeTowerTargetingPriority(placedTower);
            sceneUtils.initializeTowerTargetingPriority(towerInst);
            
            // Update targeting buttons immediately when tower is placed
            if (updateTargetingButtons && this.targetingButtons) {
              updateTargetingButtons(this.targetingButtons, placedTower, this.gameLogic, AOETower);
            }
            
            // Setup tower click handler using modular input function
            setupTowerClickHandler(
              placedTower,
              this,
              this.gameLogic,
              showRangeCircle,
              updateTargetingButtons,
              AOETower,
              sceneUtils
            );
            
            // Deduct gold using utility function
            sceneUtils.deductGold(this, price);
            
            // Refresh shop availability after gold is deducted
            this._refreshShopAvailability();
          } catch (error) {
            console.error(`Failed to place tower ${className}:`, error);
          }
        };

    // Use modular shop UI refresh
    this._refreshShopAvailability = () => refreshShopAvailability(this);

    // Draw info bar, life bar, heart, and gold UI using the modular function
    drawInfoBarUI(this, gameWidth, gameHeight, shopWidth, infoBarHeight);
    // Provide a generic updateLifeBar method for the scene
    this._updateLifeBar = () => updateLifeBar(this);
    this._updateLifeBar();

    // Buying/placing phase UI
    // Create targeting priority buttons using modular UI
    this.targetingButtons = createTargetingButtons(this, gameHeight, infoBarHeight, this.gameLogic);
    // Wave text appears after targeting buttons
    // Place wave text to the left of Start Wave button
    const startWaveBtnX = gameWidth - shopWidth / 2;
    const waveTextX = startWaveBtnX - 200; // 200px left of button for more spacing
    this.waveText = this.add.text(waveTextX, gameHeight - infoBarHeight / 2, `Wave: ${this.waveNumber}`, {
      font: "20px Arial",
      fill: "#fff"
    }).setOrigin(0, 0.5);

    // Create Start Wave button
    this.startWaveButton = this.add.text(gameWidth - shopWidth / 2, gameHeight - infoBarHeight / 2, "Start Wave", {
      font: "28px Arial",
      fill: "#00ff00",
      backgroundColor: "#222",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.startWaveButton.setDepth(1000);
    this.startWaveButton.input.enabled = true; // Ensure enabled
    // Setup start wave button handler using modular input function
    setupStartWaveButtonHandler(this.startWaveButton, this, spawnWave);

    // Setup game field click handler for tower deselection
    setupGameFieldClickHandler(this, gameWidth, shopWidth, gameHeight, infoBarHeight);

    // Animations are now set up centrally in setupAnimations() call during create()


    // Use modular game over popup
    this._showGameOverPopup = () => {
                  // Remove lingering BirdTower selection circle if present
                  if (this._birdSelectCircle) {
                    this._birdSelectCircle.destroy();
                    this._birdSelectCircle = null;
                  }
            // Remove all explosion sprites (explode_anim) before showing game over
            if (this.children && this.children.list) {
              this.children.list
                .filter(child => child.texture && child.texture.key === 'explode_anim')
                .forEach(child => { if (child.destroy) child.destroy(); });
            }
      // Hide any active range circle before showing game over
      if (typeof hideRangeCircle === 'function') hideRangeCircle(this);
      
      // Disable all spike tower shooting
      if (this.gameLogic && Array.isArray(this.gameLogic.towers)) {
        for (const tower of this.gameLogic.towers) {
          if (tower && tower.constructor && tower.constructor.name === 'SpikeTower') {
            tower._spikeShootingDisabled = true;
          }
        }
      }
      
      // Stop wave spawning and destroy all remaining bloons
      if (this.gameLogic && this.gameLogic._waveTimeouts && Array.isArray(this.gameLogic._waveTimeouts)) {
        this.gameLogic._waveTimeouts.forEach(tid => clearTimeout(tid));
        this.gameLogic._waveTimeouts = [];
      }
      if (this.gameLogic && Array.isArray(this.gameLogic.enemies)) {
        for (const enemy of this.gameLogic.enemies) {
          if (enemy && typeof enemy.destroy === 'function') {
            enemy.destroy();
          }
          if (enemy && enemy._sprite && typeof enemy._sprite.destroy === 'function') {
            enemy._sprite.destroy();
            enemy._sprite = null;
          }
        }
        this.gameLogic.enemies = [];
      }
      
      // Stop all instances of main game music if playing
      if (this.sound && this.sound.getAll) {
        this.sound.getAll('main_game_music').forEach(snd => snd.stop());
      } else if (this.sound && this.sound.get('main_game_music')) {
        this.sound.get('main_game_music').stop();
      }
      // Play game over music
      if (this.cache.audio.exists('game_over_music')) {
        if (!this.sound.get('game_over_music')) {
          this.sound.play('game_over_music', { loop: false, volume: 0.8 });
        } else {
          this.sound.get('game_over_music').play();
        }
      }
      showGameOverPopup(this, {
        onReplay: () => {
          this._gameOverShown = false;
          // Stop game over music if playing
          if (this.sound && this.sound.get('game_over_music')) {
            this.sound.get('game_over_music').stop();
          }
          if (this.sound && this.sound.getAll) {
           this.sound.getAll('main_game_music').forEach(snd => snd.stop());
        }
          // Restart main game music if sound is on
          if (this.soundOn !== false && this.cache.audio.exists('main_game_music')) {
            // Always stop any existing instance first
            if (this.sound.get('main_game_music')) {
              this.sound.get('main_game_music').stop();
            }
            this.sound.play('main_game_music', { loop: true, volume: 0.7 });
          }
          window.sceneRef = this; // Ensure global reference is correct after replay
          // Hide range circle before anything else
          if (typeof hideRangeCircle === 'function') hideRangeCircle(this);
          // Destroy upgrade UI and selected tower state
          if (this.upgradeUI && typeof this.upgradeUI.destroy === 'function') {
            this.upgradeUI.destroy();
            this.upgradeUI = null;
          }
          if (this.upgradeTooltip && typeof this.upgradeTooltip.destroy === 'function') {
            this.upgradeTooltip.destroy();
            this.upgradeTooltip = null;
          }
          this.selectedTowerForUpgradeUI = null;
          // Hide targeting buttons
          if (this.targetingButtons && Array.isArray(this.targetingButtons)) {
            // Hide all targeting buttons and label
            if (typeof window !== 'undefined' && window.targetingUI && typeof window.targetingUI.hideTargetingButtons === 'function') {
              window.targetingUI.hideTargetingButtons(this.targetingButtons);
            } else if (this.targetingButtons.forEach) {
              this.targetingButtons.forEach(btn => btn.setVisible(false));
              if (this.targetingButtons.targetingLabel) this.targetingButtons.targetingLabel.setVisible(false);
            }
          }
          // Reset gold to starting amount
          this.goldAmount = STARTING_GOLD;
          if (this.goldText) this.goldText.setText(String(this.goldAmount));
          // Reset game state to wave 1
          this.playerLives = this.maxPlayerLives;
          this._updateLifeBar();
          this.waveNumber = 1;
          this.currentWaveIndex = 0;
          // Reset game state machine to buying phase
          this.gameStateMachine.reset(GAME_PHASES.BUYING);
          // Reset game logic state using utility function
          sceneUtils.resetGameLogicState(this.gameLogic);
          // Remove placed tower images using utility function
          sceneUtils.removePlacedTowerSprites(this, this.gameLogic);
          // Remove all projectiles and spikes
          sceneUtils.removeAllProjectiles(this);
          // Clear spike projectiles array and destroy any remaining spike sprites
          if (this.spikeProjectiles && Array.isArray(this.spikeProjectiles)) {
            for (const spike of this.spikeProjectiles) {
              if (spike && typeof spike.destroy === 'function') {
                spike.destroy();
              }
            }
            this.spikeProjectiles = [];
          }
          // Remove all fruit sprites/images using utility function
          sceneUtils.removeFruitSprites(this);
          // Show game elements again
          if (this.enemyGraphics) this.enemyGraphics.setVisible(true);
          // Redraw the shop UI to restore tower images
          drawShopUI(this, 1600, 900, 220, 100, towerConfig);

          // --- Additional cleanup for upgrades and fruit sprites ---
          // Clear upgrade UI and selected tower state
          this.selectedTowerForUpgradeUI = null;
          if (this.upgradeUI && this.upgradeUI.setVisible) this.upgradeUI.setVisible(false);
          // Remove all fruit sprites/images (any image with 'fruit' in texture key)
          if (this.children && this.children.list) {
            this.children.list
              .filter(child => child.texture && typeof child.texture.key === 'string' && child.texture.key.includes('fruit'))
              .forEach(child => { if (child.destroy) child.destroy(); });
          }
          
          // --- Final comprehensive cleanup: destroy any remaining sprites at specific game depths ---
          // Placed towers: depth 1001, Projectiles: depth 1000 (but NOT text objects like startWaveButton)
          // Shop towers (depth 100), drag preview (depth 2000), range circle (1999) are preserved
          if (this.children && this.children.list) {
            // Only remove SPRITES at depths 1000 and 1001, not text objects
            const remainingSprites = this.children.list.filter(child => {
              if (child.depth === 1000 || child.depth === 1001) {
                // Skip text objects (like startWaveButton)
                return child.type !== 'Text';
              }
              return false;
            });
            remainingSprites.forEach(child => {
              if (child.destroy) child.destroy();
            });
          }
          
          // Recreate the Start Wave button
          const gameWidth = 1600;
          const shopWidth = 220;
          const infoBarHeight = 100;
          
          // Update wave text
          if (this.waveText) {
            this.waveText.setText(`Wave: ${this.waveNumber}`);
          }
          
          // Destroy old button if it exists
          if (this.startWaveButton) {
            this.startWaveButton.destroy();
            this.startWaveButton = null;
          }
          
          // Create new Start Wave button
          this.startWaveButton = this.add.text(
            gameWidth - shopWidth / 2,
            this.sys.game.config.height - infoBarHeight / 2,
            "Start Wave",
            {
              font: "28px Arial",
              fill: "#00ff00",
              backgroundColor: "#222",
              padding: { x: 20, y: 10 }
            }
          ).setOrigin(0.5);
          
          // Ensure button is interactive and enabled
          this.startWaveButton.setInteractive({ useHandCursor: true });
          this.startWaveButton.input.enabled = true;
          this.startWaveButton.setDepth(500);
          
          // Add event listener
          this.startWaveButton.on("pointerdown", () => {
            if (!this.gameStateMachine.isInPhase(GAME_PHASES.BUYING) || !this.startWaveButton.input.enabled) return;
            transitionGamePhase(this, GAME_PHASES.SPAWNING);
            this.startWaveButton.setStyle({ fill: "#888" });
            this.startWaveButton.disableInteractive();
            this._waveCompletionBonusAwarded = false;
            this._waveEndTriggered = false;
            spawnWave(this, this.gameLogic, this.currentWaveIndex);
            this.currentWaveIndex++;
          });
          
          // Reset UI elements now that button exists
          sceneUtils.resetSceneUIElements(this);
        },
        onQuit: () => {
          this._gameOverShown = false;
          // Stop game over music if playing
          if (this.sound && this.sound.get('game_over_music')) {
            this.sound.get('game_over_music').stop();
          }
          // Completely clear the scene before leaving
          if (this.children && this.children.list) {
            const allChildren = [...this.children.list];
            allChildren.forEach(child => {
              if (child && typeof child.destroy === 'function') {
                child.destroy();
              }
            });
          }
          // Stop this scene and go to start screen
          this.scene.stop();
          this.scene.start('IntroScene');
        }
      });
    };
    // No need for manual timer; Phaser will call update()
    
    // Add shutdown event listener to clean up when scene stops
    this.events.on('shutdown', () => {
      console.log('[BalouneScene] shutdown event fired, destroying all children');
      if (this.children && this.children.list) {
        const allChildren = [...this.children.list];
        allChildren.forEach(child => {
          if (child && typeof child.destroy === 'function') {
            child.destroy();
          }
        });
      }
    });
            if (soundOnLoaded && soundOffLoaded) {

          this.soundToggleButton = this.add.image(1350, 770, 'sound_on')
            .setDisplaySize(50, 50)
            .setInteractive({ useHandCursor: true })
            .setDepth(99999);
          this.soundToggleButton.on('pointerdown', () => {
            this.soundOn = !this.soundOn;
            if (this.soundOn) {
              this.soundToggleButton.setTexture('sound_on');
              if (this.cache.audio.exists('main_game_music')) {
                const allMusic = this.sound.getAll('main_game_music');
                if (allMusic.length === 0 || allMusic.every(snd => !snd.isPlaying && !snd.isPaused)) {
                  this.sound.play('main_game_music', { loop: true, volume: 0.7 });
                } else {
                  allMusic.forEach(snd => snd.resume());
                }
              }
            } else {
              this.soundToggleButton.setTexture('sound_off');
              // Pause music
              this.sound.getAll('main_game_music').forEach(snd => snd.pause());
              console.log('Main game music paused');
            }
          });
          // If music is off at start, show correct icon
          if (!this.soundOn) {
            this.soundToggleButton.setTexture('sound_off');
          }
        }
  }

  shutdown() {
    // This lifecycle method might not be called, but keeping it for safety
    console.log('[BalouneScene.shutdown] Cleaning up, children=', this.children.list.length);
    if (this.children && this.children.list) {
      const allChildren = [...this.children.list];
      allChildren.forEach(child => {
        console.log('[BalouneScene.shutdown] Destroying:', child.type, 'depth:', child.depth);
        if (child && typeof child.destroy === 'function') {
          child.destroy();
        }
      });
    }
  }
}
export default BalouneScene;