import Phaser from "phaser";

// DEV: Set this to true to skip the initial 'Survive 50 Waves' popup
import { Baloune } from "../../game/Baloune.js";
import towerConfig from "../../game/towers/tower.json";
import bloonsConfig from "../../game/enemies/bloons.json";
import { showUpgradeUI, refreshUpgradeUIIfVisible } from "../ui/upgradeUI.js";
import { spawnWave, parseWaveString } from "../logic/waveLogic.js";
import { drawShopUI, refreshShopAvailability } from "../ui/shopUI.js";
import { refreshDynamicShopAvailability } from "../ui/dynamicShopUI.js";
import { drawInfoBarUI, updateLifeBar } from "../ui/infoBarUI.js";
import { createTargetingButtons, updateTargetingButtons } from "../ui/targetingUI.js";
import { AOETower } from "../../game/towers/AOETower.js";
import { ImpactTower } from "../../game/towers/ImpactTower.js";
import { SniperTower } from "../../game/towers/SniperTower.js";
import { addSpikeProjectile } from "../../game/towers/spikeProjectile.js";
import { StarTower } from "../../game/towers/StarTower.js";
import * as towerPlacement from "../logic/towerPlacement.js";
import { renderEnemies } from "../renderer/enemyRenderer.js";
import { showGameOverPopup } from "../ui/gameOverUI.js";
import { showWinGamePopup } from "../ui/winGameUI.js";
import { showGameStartPopup } from "../ui/gameStartUI.js";
import { createSoundToggleButton } from "../ui/soundToggleUI.js";
import { createStartWaveButton, createWaveText } from "../ui/startWaveUI.js";
import { cleanupSceneUI, resetSceneUIElements } from "../ui/sceneUIUtils.js";
import { showRangeCircle, hideRangeCircle } from "../logic/towerPlacement.js";
import * as sceneUtils from "../utils/sceneUtils.js";
import * as sceneSetup from "../utils/sceneSetup.js";
import { setupTowerClickHandler, setupStartWaveButtonHandler, setupGameFieldClickHandler } from "../input/inputHandlers.js";
import { setupGameStateMachine, GAME_PHASES, transitionGamePhase } from "../state/gameStateManager.js";
import { setupAnimations, ANIMATION_KEYS, isPlayingAnimation } from "../animations/animationDefinitions.js";
import * as musicManager from "../utils/musicManager.js";


// DEV: Set this to start from a specific wave for testing
const DEV_START_WAVE = 4 // Set to 1 for normal, or e.g. 5 to start from wave 5

const SKIP_SURVIVE_50_POPUP = false;

// DEV: Set this to control the overall size of all bloons (default 1)
const BLOON_SIZE_MULTIPLIER = 1.1;

// DEV: Set this to control the overall size of all placed towers (default 1)
const PLACED_TOWER_SIZE_MULTIPLIER = 1.2;

// DEV: Set this to control the overall speed of all bloons (default 1)
const BLOON_SPEED_MULTIPLIER = 1.0;

// DEV: Set the starting gold amount for the player
const STARTING_GOLD = 13650;

// Ensure the global variables are set from here if not already set
if (typeof window !== 'undefined') {
  window.BLOON_SIZE_MULTIPLIER = BLOON_SIZE_MULTIPLIER;
  window.BLOON_SPEED_MULTIPLIER = BLOON_SPEED_MULTIPLIER;
}

class BalouneScene extends Phaser.Scene {
    _lastSquirtSoundTime = 0;
  /**
   * Deselect the currently selected tower and hide all related UI (public method for shopUI)
   */
  deselectTower() {
    // Always use the canonical inputHandlers.deselectTower
    if (typeof window !== 'undefined' && window.inputHandlers && typeof window.inputHandlers.deselectTower === 'function') {
      window.inputHandlers.deselectTower(this);
    }
  }
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

    // Enable physics system
    this.physics = this.physics || this.sys.physics;

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
        if (tower && tower.towerType === 'spike') {
          tower._spikeShootingDisabled = !isSpawning;
        }
      }
    }

    // --- Spike projectile collision logic ---
    if (this.spikeProjectiles && this.gameLogic && Array.isArray(this.gameLogic.enemies)) {
      for (const spike of [...this.spikeProjectiles]) { // clone array in case of removal
        if (!spike || !spike.active) continue;
        for (const bloon of this.gameLogic.enemies) {
          if (!bloon || !bloon.isActive) continue;
          // Use hitRadius for collision
          const dx = spike.x - bloon.position.x;
          const dy = spike.y - bloon.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (spike.hitRadius || 24)) {
            // For fat spikes, allow multiple hits on the same target; for regular spikes, only hit once per target
            const isFatSpike = typeof spike.remainingPops === 'number';
            if (isFatSpike || !spike._hasHit.has(bloon)) {
              // Apply damage (assume bloon has takeDamage method)
              let destroyed = false;
              if (typeof bloon.takeDamage === 'function') {
                const prevHealth = bloon.health ?? bloon.damage;
                // Always do at least 1 damage to boss bloons, and spike damage is 3x against boss
                const isBoss = bloon.type === 'boss' || bloon.constructor?.name === 'BossBloon';
                const spikeDmg = isBoss ? Math.max(1, spike.damage * 3) : spike.damage;
                bloon.takeDamage(spikeDmg);
                // If bloon is destroyed after taking damage
                if (!bloon.isActive || (typeof bloon.health === 'number' && bloon.health <= 0) || (typeof bloon.damage === 'number' && bloon.damage <= 0)) {
                  destroyed = true;
                  // Play squirt sound with minimal cooldown, allow overlap
                  const now = Date.now();
                  if (this.sound && this.sound.play && (!this._lastSquirtSoundTime || now - this._lastSquirtSoundTime > 30)) {
                    this.sound.play('squirt', { volume: 1 });
                    this._lastSquirtSoundTime = now;
                  }
                }
              } else if (typeof bloon.damage === 'number') {
                bloon.damage -= spike.damage;
                if (bloon.damage <= 0 && typeof bloon.destroy === 'function') {
                  bloon.destroy();
                  destroyed = true;
                  // Play squirt sound with minimal cooldown, allow overlap
                  const now = Date.now();
                  if (this.sound && this.sound.play && (!this._lastSquirtSoundTime || now - this._lastSquirtSoundTime > 30)) {
                    this.sound.play('squirt', { volume: 1 });
                    this._lastSquirtSoundTime = now;
                  }
                }
              }
              // Only add to _hasHit if it's not a fat spike (fat spikes use remainingPops instead)
              if (!isFatSpike) {
                spike._hasHit.add(bloon);
              }
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
              // If we hit a boss with a non-fat spike, destroy the spike
              const isBoss = bloon.type === 'boss' || bloon.constructor?.name === 'BossBloon';
              if (isBoss && !isFatSpike) {
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
        // Stop boss music when showing win screen
        musicManager.stopBossMusic(this);
        // Show win game popup
        this._gameOverShown = true;
        showWinGamePopup(this, {
          onReplay: () => {
            this._gameOverShown = false;
            // Stop game over music and main game music
            musicManager.stopGameOverMusic(this);
            musicManager.stopMainMusic(this);
            window.sceneRef = this;
            // Hide range circle before anything else
            // Use Phaser's scene.restart to fully reset the scene and UI
            // Always use the stored mapConfig for replay
            const mapConfig = window._lastMapConfig || this._initialMapConfig;
            this.scene.restart({ mapConfig, soundOn: this.soundOn });
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
          },
          onQuit: () => {
            this._gameOverShown = false;
            // Stop win sound if playing
            if (this.sound && this.sound.get('win')) {
              this.sound.get('win').stop();
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

        // Remove all clumpspike traps
        if (this.gameLogic && Array.isArray(this.gameLogic.towers)) {
          for (let i = this.gameLogic.towers.length - 1; i >= 0; i--) {
            const tower = this.gameLogic.towers[i];
            if (tower && (tower.towerType === 'clumpspike' || tower.towerType === 'clump_spike') && typeof tower.destroy === 'function') {
              tower.destroy();
              this.gameLogic.towers.splice(i, 1);
            }
          }
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
        this.startWaveButton.setDepth(5000);
        this.startWaveButton.on("pointerdown", () => {
          if (!this.gameStateMachine.isInPhase(GAME_PHASES.BUYING) || !this.startWaveButton.input.enabled) return;
          // If starting wave 50, play boss music
          if (this.waveNumber === 50) {
            musicManager.playBossMusic(this);
          }
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
        // Load boss music
        this.load.audio('boss_music', '/sounds/boss.mp3');
        // Load game over music
        this.load.audio('game_over_music', '/sounds/game_over.mp3');
        this.load.audio('win', 'sounds/win.mp3');
    // Load explode_anim spritesheet for projectile destruction
    // 1477px / 7 frames = ~211px per frame
    this.load.spritesheet('explode_anim', 'towers/explode_anim.png', { frameWidth: 211, frameHeight: 202 }); // 1477/7=211
    // Load boomerang projectile image for BoomerangTower
    this.load.image('boomerang_projectile', '/towers/projectiles/boomerang.png');
    // Load kangaroo_anim spritesheet for BoomerangTower
    this.load.spritesheet('kangaroo_anim', '/towers/kangaroo_anim.png', { frameWidth: 516, frameHeight: 800 });
    // Preload laser projectile spritesheet
    this.load.spritesheet('laser_anim', '/towers/projectiles/laser_anim2.png', { frameWidth: 195, frameHeight: 190 });
    // Preload fire projectile spritesheet (7 frames of 97x133)
    this.load.spritesheet('fire_anim', '/towers/projectiles/fire_anim.png', { frameWidth: 97, frameHeight: 133 });
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
        // Also load with animation key if different from ${key}_placed
        const animKey = config.assets.animation.key || `${key}_placed`;
        if (animKey !== `${key}_placed`) {
          this.load.spritesheet(animKey, config.assets.placedImage, {
            frameWidth: config.assets.animation.frameWidth,
            frameHeight: config.assets.animation.frameHeight
          });
        }
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
    // Load tornado projectile spritesheet for elephant tower
    this.load.spritesheet('tornado_anim', '/towers/projectiles/tornado_anim.png', { frameWidth: 135, frameHeight: 134 });
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
    // Preload beam_anim spritesheet for OvniTower beam (3 frames of 209x207)
    this.load.spritesheet('beam_anim', '/towers/beam_anim.png', { frameWidth: 209, frameHeight: 207 });
    // Preload ovni sound for OvniTower
    this.load.audio('ovni', '/sounds/ovni.mp3');
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

    // Stop intro music if it's playing from previous scenes
    if (this.sound && this.sound.getAll) {
      this.sound.getAll('intro_music').forEach(snd => snd.stop());
    } else if (this.sound && this.sound.get('intro_music')) {
      this.sound.get('intro_music').stop();
    }
    // Use musicManager for main and boss music
    musicManager.playMainMusic(this);
    musicManager.stopBossMusic(this);
    if (this._bossMusicStarted && (!this.waveInProgress || this._gameOverShown)) {
      musicManager.stopBossMusic(this);
      this._bossMusicStarted = false;
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
      cleanupSceneUI(this);
    
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
    
    // Subscribe to phase changes to refresh shop availability (for trap availability)
    this.gameStateMachine.onChange(() => {
      refreshShopAvailability(this);
    });
    
    // Setup all game animations (pass bloonsConfig for dynamic bloon animations)
    setupAnimations(this, towerConfig, bloonsConfig);
    
    // const gameWidth = 1600;
    // const gameHeight = 900;
    // const shopWidth = 220;
    // const infoBarHeight = 100;

    // Use mapConfig from data and store it globally for replay
    const mapConfig = data?.mapConfig;
    // Also check if mapConfig is stored on window (for replay fallback)
    const finalMapConfig = mapConfig || window._lastMapConfig;
    // Store mapConfig globally so it persists across scene restarts
    if (finalMapConfig) {
      window._lastMapConfig = finalMapConfig;
      this._initialMapConfig = finalMapConfig;
    }
    sceneSetup.setupMapAndGameLogic(this, finalMapConfig);

    // Modular background and graphics setup
    sceneSetup.setupBackground(this, finalMapConfig, gameWidth, gameHeight, shopWidth, infoBarHeight);

    // Draw the shop UI using the modular function
    drawShopUI(this, gameWidth, gameHeight, shopWidth, infoBarHeight, towerConfig);
    // Ensure trap buttons are grayed out if not in SPAWNING phase
    refreshShopAvailability(this);

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
            // Deselect previous tower (don't auto-select the newly placed tower)
            if (typeof window !== 'undefined' && window.inputHandlers && typeof window.inputHandlers.deselectTower === 'function') {
              window.inputHandlers.deselectTower(this);
            } else if (typeof this.deselectTower === 'function') {
              this.deselectTower();
            } else {
              this.selectedTowerForUpgradeUI = null;
            }
            
            // Initialize targeting priority and UI for towers that are NOT clumpspike or bomb_trap
            const isTrap = placedTower.towerType === 'clumpspike' || placedTower.towerType === 'bomb_trap';
            if (!isTrap) {
              sceneUtils.initializeTowerTargetingPriority(placedTower);
              sceneUtils.initializeTowerTargetingPriority(towerInst);
              // Do NOT update targeting buttons here; only show on selection
              // Setup tower click handler
              setupTowerClickHandler(
                placedTower,
                this,
                this.gameLogic,
                showRangeCircle,
                updateTargetingButtons,
                AOETower,
                sceneUtils
              );
            }
            
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
    this.waveText = createWaveText(this, waveTextX, gameHeight - infoBarHeight / 2, this.waveNumber);
    this.startWaveButton = createStartWaveButton(
      this,
      gameWidth - shopWidth / 2,
      gameHeight - infoBarHeight / 2,
      () => {
        if (!this.gameStateMachine.isInPhase(GAME_PHASES.BUYING) || !this.startWaveButton.input.enabled) return;
        // If starting wave 50, play boss music
        if (this.waveNumber === 50) {
          if (this.sound && this.sound.get('boss_music')) {
            this.sound.get('boss_music').stop();
          }
          if (this.soundOn !== false && this.cache.audio.exists('boss_music')) {
            this.sound.play('boss_music', { loop: true, volume: 0.8 });
          }
        }
        transitionGamePhase(this, GAME_PHASES.SPAWNING);
        this.startWaveButton.setStyle({ fill: "#888" });
        this.startWaveButton.disableInteractive();
        this._waveCompletionBonusAwarded = false;
        this._waveEndTriggered = false;
        spawnWave(this, this.gameLogic, this.currentWaveIndex);
        this.currentWaveIndex++;
      }
    );

    // Setup game field click handler for tower deselection
    setupGameFieldClickHandler(this, gameWidth, shopWidth, gameHeight, infoBarHeight);

    // Draw a global horizontal separator line at the bottom window
    const bottomLineY = 845 - 45; // Position above the info bar
    const bottomLineGraphics = this.add.graphics();
    bottomLineGraphics.lineStyle(3, 0x000000, 1); // Black line, 3px thick
    bottomLineGraphics.beginPath();
    bottomLineGraphics.moveTo(0, bottomLineY);
    bottomLineGraphics.lineTo(gameWidth, bottomLineY);
    bottomLineGraphics.strokePath();
    bottomLineGraphics.setDepth(100); // Lower than all tooltips and popups

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
      
      // Disable all spike tower shooting and destroy OvniTower beams
      if (this.gameLogic && Array.isArray(this.gameLogic.towers)) {
        for (const tower of this.gameLogic.towers) {
          if (tower && tower.constructor && tower.constructor.name === 'SpikeTower') {
            tower._spikeShootingDisabled = true;
          }
          // Destroy OvniTower beams
          if (tower && tower.constructor && tower.constructor.name === 'OvniTower' && tower._beamSprite) {
            tower._beamSprite.destroy();
            tower._beamSprite = null;
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
      
        // Stop boss music and main music when showing game over screen
        musicManager.stopBossMusic(this);
        musicManager.stopMainMusic(this);
        musicManager.playGameOverMusic(this);
      showGameOverPopup(this, {
        onReplay: () => {
          this._gameOverShown = false;
          musicManager.stopGameOverMusic(this);
          window.sceneRef = this;
          // Always restart the scene to fully reset UI and game state
          const mapConfig = window._lastMapConfig || this._initialMapConfig;
          this.scene.restart({ mapConfig, soundOn: this.soundOn });
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
    // Create sound toggle button using modular UI
    this.soundToggleButton = createSoundToggleButton(this);
    // Show game start popup unless skipping
    if (!SKIP_SURVIVE_50_POPUP) {
      showGameStartPopup(this);
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