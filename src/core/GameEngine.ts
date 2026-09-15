import { GameState, StageId } from '../types';
import { InputHandler } from './InputHandler';
import { EntityManager } from './EntityManager';
import { Renderer } from '../graphics/Renderer';
import { StarfieldManager } from '../graphics/StarfieldManager';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { CameraShake } from '../graphics/CameraShake';
import { soundSynthesizer } from '../audio/SoundSynthesizer';
import { UIManager } from '../ui/UIManager';
import { Enemy } from '../entities/Enemy';
import { BossMollusk } from '../entities/BossMollusk';
import { BossSentinel } from '../entities/BossSentinel';
import { BossLeviathan } from '../entities/BossLeviathan';
import { BossQuantum } from '../entities/BossQuantum';
import { filterManager } from '../graphics/FilterManager';
import { highScoreManager } from '../ui/HighScoreManager';

import { shopManager } from '../ui/ShopManager';

export class GameEngine {
  public readonly canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private starfield: StarfieldManager;
  private particleSystem: ParticleSystem;
  private cameraShake: CameraShake;
  private input: InputHandler;
  private entities: EntityManager;
  private ui: UIManager;

  private state: GameState = 'CINEMATIC_INTRO';
  private previousState: GameState = 'MAIN_MENU';
  private stageId: StageId = 1;
  private stageTimeline: number = 0;
  private readonly stageLength: number = 36.0; // Seconds before boss spawns

  // Cinematic intro chord triggers
  private chord1Played: boolean = false;
  private chord2Played: boolean = false;

  // Live ranking tracker
  private previousRank: number = 8;

  // Boss engagement state
  private bossSpawned: boolean = false;
  private warpTimer: number = 0;

  // Fixed timestep physics loop
  private readonly fixedDt: number = 1 / 60;
  private accumulator: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  // FPS metric
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFps: number = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.starfield = new StarfieldManager(960, 540);
    this.particleSystem = new ParticleSystem();
    this.cameraShake = new CameraShake();
    this.input = new InputHandler();
    this.entities = new EntityManager();
    this.ui = new UIManager();
    this.ui.setInputHandler(this.input);

    this.setupUIBindings();
  }

  private setupUIBindings(): void {
    this.ui.setCallbacks({
      onStartGame: () => this.startGame(),
      onResumeGame: () => this.resumeGame(),
      onRestartGame: () => this.restartGame(),
      onToggleMute: () => soundSynthesizer.toggleMute(),
      onToggleTouch: () => this.input.toggleTouchControls(),
      onSkipIntro: () => this.skipIntro(),
      onConfirmPilot: (callsign: string) => this.onConfirmPilot(callsign),
      onOpenShop: () => {
        this.previousState = this.state;
        this.state = 'SHOP';
      },
      onCloseShop: () => {
        this.state = this.previousState === 'PAUSED' ? 'PAUSED' : 'MAIN_MENU';
        this.entities.player.applyShip(shopManager.getEquippedShip());
      },
      onOpenSettings: () => {
        this.previousState = this.state;
        this.state = 'SETTINGS';
      },
      onCloseSettings: () => {
        this.state = this.previousState === 'PAUSED' ? 'PAUSED' : 'MAIN_MENU';
      },
    });

    // Window focus/blur protection
    window.addEventListener('blur', () => {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      }
    });
  }

  public skipIntro(): void {
    this.state = 'MAIN_MENU';
    soundSynthesizer.playUiBeep();
  }

  public onConfirmPilot(_callsign: string): void {
    this.state = 'MAIN_MENU';
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  public startGame(): void {
    soundSynthesizer.initAudioContext();
    this.state = 'PLAYING';
    this.stageId = 1;
    this.stageTimeline = 0;
    this.bossSpawned = false;
    this.previousRank = 8;
    this.entities.resetAll();
    this.entities.player.applyShip(shopManager.getEquippedShip());
    this.particleSystem.clear();
    this.starfield.setBiome('SPACE');
    this.starfield.setWarpSpeed(false);
    soundSynthesizer.setMusicTheme('STAGE1');
  }

  public resumeGame(): void {
    if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
    }
  }

  public pauseGame(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      soundSynthesizer.playUiBeep();
    }
  }

  public restartGame(): void {
    this.startGame();
  }

  public getInputHandler(): InputHandler {
    return this.input;
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    let frameTime = (currentTime - this.lastTime) / 1000;
    if (frameTime > 0.25) frameTime = 0.25; // Clamp maximum lag spike
    this.lastTime = currentTime;

    // Track FPS
    this.frameCount++;
    this.fpsTimer += frameTime;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round((this.frameCount / this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = 0;
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = this.currentFps.toString();
    }

    // Fixed timestep accumulator
    this.accumulator += frameTime;
    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    // Render frame
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    const inputState = this.input.update();

    // Check Pause button toggle
    if (this.input.consumePause()) {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
      }
    }

    // Check Secondary Weapon Cycle
    if (this.input.consumeCycleSecondary() && this.state === 'PLAYING') {
      this.entities.player.cycleSecondary();
    }

    this.ui.update(dt);
    this.cameraShake.update(dt);
    this.renderer.update(dt);
    this.starfield.update(dt);

    if (this.state === 'CINEMATIC_INTRO') {
      if (this.ui.introTimer >= 5.0 && !this.chord1Played) {
        soundSynthesizer.playCinematicChord([110, 164.81, 220, 329.63]);
        this.chord1Played = true;
      }
      if (this.ui.introTimer >= 22.0 && !this.chord2Played) {
        soundSynthesizer.playCinematicChord([130.81, 196.00, 261.63, 392.00]);
        this.chord2Played = true;
      }
      if (this.ui.introTimer >= 30.0) {
        this.skipIntro();
      }
    } else if (this.state === 'MAIN_MENU' || this.state === 'TITLE') {
      // Space or primary fire button starts game
      if (inputState.primaryFire) {
        this.startGame();
      }
    } else if (this.state === 'PLAYING') {
      this.stageTimeline += dt;

      // Track Live Leaderboard Rank-Ups
      const currentRank = highScoreManager.getLiveRank(this.entities.score).rank;
      if (currentRank < this.previousRank && this.entities.score > 0) {
        this.previousRank = currentRank;
        soundSynthesizer.playRankUpFanfare();
        this.particleSystem.emitFloatingText(
          480,
          190,
          `▲ RANK UP! NOW #${currentRank} ON LEADERBOARD! ▲`,
          '#ffea00'
        );
      }

      // Update player ship with input
      this.entities.player.update(dt, inputState, this.particleSystem, this.entities.projectiles);

      // Check player death
      if (this.entities.player.isDead) {
        this.state = 'GAME_OVER';
        soundSynthesizer.setMusicTheme('OFF');
        soundSynthesizer.playExplosion(3.0);
        this.cameraShake.addTrauma(1.0);
        highScoreManager.addScore(highScoreManager.getPilotName(), this.entities.score, this.stageId);
        return;
      }

      // Spawn wave enemies based on stage timeline
      this.updateWaveSpawner(this.stageTimeline);

      // Update entities & collisions
      this.entities.update(dt, this.particleSystem, this.cameraShake, this.renderer);
      this.particleSystem.update(dt);

      // Check Boss Defeat
      if (this.bossSpawned && this.entities.boss && this.entities.boss.isDefeated) {
        this.onBossVictory();
      }
    } else if (this.state === 'STAGE_WARP') {
      this.warpTimer += dt;
      this.particleSystem.update(dt);

      if (this.warpTimer >= 3.2) {
        // Warp forward to next Endless Sector!
        this.stageId++;
        this.state = 'PLAYING';
        this.stageTimeline = 0;
        this.bossSpawned = false;
        this.entities.boss = null;
        const isSpace = this.stageId % 2 === 1;
        this.starfield.setBiome(isSpace ? 'SPACE' : 'CYBER_FORTRESS');
        this.starfield.setWarpSpeed(false);
        soundSynthesizer.setMusicTheme(isSpace ? 'STAGE1' : 'STAGE2');
        this.particleSystem.emitFloatingText(480, 260, `ENTERING SECTOR ${this.stageId}...`, '#00f0ff');
      }
    } else if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
      this.particleSystem.update(dt);
      if (inputState.primaryFire) {
        this.startGame();
      }
    }
  }

  private updateWaveSpawner(timeline: number): void {
    if (this.bossSpawned) return;

    const sectorType = (this.stageId - 1) % 4; // 0: Mollusk space, 1: Fortress, 2: Wyrm nebula, 3: Quantum void
    const isDeepLevel = this.stageId >= 5;

    // --- Wave Enemies Spawn Schedule ---
    if (timeline >= 1.0 && timeline < 1.05) {
      this.entities.spawnEnemy(new Enemy('scout_1', 980, 150, 'SCOUT'));
      this.entities.spawnEnemy(new Enemy('scout_2', 1040, 390, 'SCOUT'));
      if (isDeepLevel) {
        this.entities.spawnEnemy(new Enemy('deep_scout', 1080, 270, 'SCOUT', true));
      }
    }
    if (timeline >= 5.5 && timeline < 5.55) {
      const swarmerCount = isDeepLevel ? 6 : 4;
      for (let i = 0; i < swarmerCount; i++) {
        this.entities.spawnEnemy(new Enemy(`swarmer_${i}`, 980 + i * 45, 100 + i * 65, 'SWARMER'));
      }
    }
    if (timeline >= 11.0 && timeline < 11.05) {
      this.entities.spawnEnemy(new Enemy('beetle_1', 990, 270, 'BEETLE'));
      this.entities.spawnEnemy(new Enemy('scout_elite', 1040, 180, 'SCOUT', true));
      if (sectorType === 1 || sectorType === 3 || isDeepLevel) {
        this.entities.spawnEnemy(new Enemy('gate_geo_1', 1020, 270, 'LASER_GATE'));
      }
    }
    if (timeline >= 17.5 && timeline < 17.55) {
      this.entities.spawnEnemy(new Enemy('tentacle_1', 990, 140, 'TENTACLE'));
      this.entities.spawnEnemy(new Enemy('tentacle_2', 1030, 400, 'TENTACLE'));
      if (isDeepLevel) {
        this.entities.spawnEnemy(new Enemy('turret_deep', 1010, 270, 'FORTRESS_TURRET'));
      }
    }
    if (timeline >= 24.0 && timeline < 24.05) {
      this.entities.spawnEnemy(new Enemy('beetle_2', 990, 200, 'BEETLE'));
      this.entities.spawnEnemy(new Enemy('beetle_3', 1020, 340, 'BEETLE'));
      this.entities.spawnEnemy(new Enemy('scout_3', 1050, 270, 'SCOUT', true));
      if (isDeepLevel) {
        this.entities.spawnEnemy(new Enemy('gate_geo_2', 1010, 270, 'LASER_GATE'));
      }
    }

    // --- BOSS ENCOUNTER SPAWN (Timeline >= 34.0s) ---
    if (timeline >= 34.0 && !this.bossSpawned) {
      this.bossSpawned = true;
      soundSynthesizer.setMusicTheme('BOSS');
      soundSynthesizer.playBossAlarm();

      const hpMult = 1 + (this.stageId - 1) * 0.35;

      if (sectorType === 0) {
        // Sector 1: Cybernetic Mollusk
        const boss = new BossMollusk(860, 270);
        if (this.stageId > 1) {
          boss.maxHealth = Math.round(boss.maxHealth * hpMult);
          boss.health = boss.maxHealth;
          boss.bossName = `CYBERNETIC MOLLUSK MK.${Math.ceil(this.stageId / 4)}`;
        }
        this.entities.setBoss(boss);
        this.particleSystem.emitFloatingText(480, 180, `WARNING: ${boss.bossName} APPROACHING`, '#ff0055');
      } else if (sectorType === 1) {
        // Sector 2: Core Sentinel
        const boss = new BossSentinel(820, 270);
        boss.maxHealth = Math.round(boss.maxHealth * hpMult);
        boss.health = boss.maxHealth;
        if (this.stageId > 2) {
          boss.bossName = `CORE SENTINEL OMEGA-V${this.stageId}`;
        }
        this.entities.setBoss(boss);
        this.particleSystem.emitFloatingText(480, 180, `ALERT: ${boss.bossName} DETECTED`, '#ff0033');
      } else if (sectorType === 2) {
        // Sector 3: Astro-Wyrm Leviathan
        const boss = new BossLeviathan(780, 270);
        boss.maxHealth = Math.round(boss.maxHealth * hpMult);
        boss.health = boss.maxHealth;
        if (this.stageId > 3) {
          boss.bossName = `ASTRO-WYRM LEVIATHAN MK.${Math.ceil(this.stageId / 4)}`;
        }
        this.entities.setBoss(boss);
        this.particleSystem.emitFloatingText(480, 180, `ALERT: ${boss.bossName} DETECTED`, '#ffaa00');
      } else {
        // Sector 4: Quantum Matrix Colossus
        const boss = new BossQuantum(780, 270);
        boss.maxHealth = Math.round(boss.maxHealth * hpMult);
        boss.health = boss.maxHealth;
        if (this.stageId > 4) {
          boss.bossName = `QUANTUM MATRIX COLOSSUS MK.${Math.ceil(this.stageId / 4)}`;
        }
        this.entities.setBoss(boss);
        this.particleSystem.emitFloatingText(480, 180, `ALERT: ${boss.bossName} INITIATED`, '#00f0ff');
      }

      if (isDeepLevel) {
        this.particleSystem.emitFloatingText(
          480,
          220,
          '⚡ GEOMETRY DASH OVERDRIVE ACTIVE! ⚡',
          '#ffea00'
        );
      }
    }
  }

  private onBossVictory(): void {
    this.state = 'STAGE_WARP';
    this.warpTimer = 0;
    this.starfield.setWarpSpeed(true);
    soundSynthesizer.setMusicTheme('OFF');
    soundSynthesizer.playPowerup();
    const sectorBonus = 20000 * this.stageId;
    this.entities.score += sectorBonus;
    this.particleSystem.emitFloatingText(
      480,
      220,
      `SECTOR ${this.stageId} CLEARED! +${sectorBonus.toLocaleString()} PTS`,
      '#00ff66'
    );
    this.particleSystem.emitFloatingText(
      480,
      255,
      `WARP TO SECTOR ${this.stageId + 1} ENGAGED`,
      '#00f0ff'
    );

    // Apply Nostalgic Level Screen Filter (Random / Mode per level)
    const newFilter = filterManager.onSectorWarp(this.stageId + 1);
    const filterLabel =
      newFilter === 'NOKIA_CLASSIC'
        ? 'NOKIA 3310 MONOCHROME LCD'
        : newFilter === 'NOKIA_BLUE'
        ? 'NOKIA 3330 BLUE BACKLIGHT'
        : newFilter === 'GAMEBOY_DMG'
        ? 'GAME BOY DMG 4-SHADE'
        : newFilter === 'CYBER_AMBER'
        ? 'AMBER PHOSPHOR CRT'
        : 'MODERN FULL COLOR OLED';

    this.particleSystem.emitFloatingText(
      480,
      290,
      `// RETRO DISPLAY MATRIX: ${filterLabel} //`,
      '#ffea00'
    );
  }

  private render(): void {
    // 1. Begin Frame & Background
    this.renderer.beginFrame(this.starfield, this.cameraShake);
    const ctx = this.renderer.getContext();

    // 2. Render Particles
    this.renderer.renderParticles(this.particleSystem);

    // 3. Render Entities (Player, Enemies, Boss, Bullets, Drops)
    if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAME_OVER' || this.state === 'VICTORY') {
      this.entities.draw(ctx);
    }

    // 4. End Frame & Post FX
    this.renderer.endFrame();

    // 5. Render UI & HUD on top
    const stageProgress = this.bossSpawned ? 1.0 : this.stageTimeline / this.stageLength;
    this.ui.draw(
      ctx,
      this.state,
      this.stageId,
      stageProgress,
      this.entities,
      this.input.isTouchEnabled
    );
  }
}
