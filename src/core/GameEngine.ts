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
import { highScoreManager } from '../ui/HighScoreManager';

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
    });

    // Window focus/blur protection
    window.addEventListener('blur', () => {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      }
    });
  }

  public skipIntro(): void {
    this.state = 'PILOT_ENTRY';
    soundSynthesizer.playUiBeep();
  }

  public onConfirmPilot(_callsign: string): void {
    this.startGame();
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
    } else if (this.state === 'TITLE') {
      // Space or fire button starts game
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

    const isSpaceSector = this.stageId % 2 === 1;

    if (isSpaceSector) {
      // --- ENDLESS DEEP SPACE SECTOR TIMELINE ---
      if (timeline >= 1.0 && timeline < 1.05) {
        this.entities.spawnEnemy(new Enemy('scout_1', 980, 150, 'SCOUT'));
        this.entities.spawnEnemy(new Enemy('scout_2', 1040, 390, 'SCOUT'));
      }
      if (timeline >= 5.5 && timeline < 5.55) {
        for (let i = 0; i < 4; i++) {
          this.entities.spawnEnemy(new Enemy(`swarmer_${i}`, 980 + i * 50, 120 + i * 80, 'SWARMER'));
        }
      }
      if (timeline >= 11.0 && timeline < 11.05) {
        this.entities.spawnEnemy(new Enemy('beetle_1', 990, 270, 'BEETLE'));
        this.entities.spawnEnemy(new Enemy('scout_elite', 1040, 180, 'SCOUT', true));
      }
      if (timeline >= 17.5 && timeline < 17.55) {
        this.entities.spawnEnemy(new Enemy('tentacle_1', 990, 140, 'TENTACLE'));
        this.entities.spawnEnemy(new Enemy('tentacle_2', 1030, 400, 'TENTACLE'));
      }
      if (timeline >= 24.0 && timeline < 24.05) {
        this.entities.spawnEnemy(new Enemy('beetle_2', 990, 200, 'BEETLE'));
        this.entities.spawnEnemy(new Enemy('beetle_3', 1020, 340, 'BEETLE'));
        this.entities.spawnEnemy(new Enemy('scout_3', 1050, 270, 'SCOUT', true));
      }
      // Boss Mollusk
      if (timeline >= 34.0 && !this.bossSpawned) {
        this.bossSpawned = true;
        soundSynthesizer.setMusicTheme('BOSS');
        soundSynthesizer.playBossAlarm();
        const boss = new BossMollusk(860, 270);
        if (this.stageId > 1) {
          const mult = 1 + (this.stageId - 1) * 0.35;
          boss.maxHealth = Math.round(boss.maxHealth * mult);
          boss.health = boss.maxHealth;
          boss.bossName = `CYBERNETIC MOLLUSK MK.${Math.ceil(this.stageId / 2)}`;
        }
        this.entities.setBoss(boss);
        this.particleSystem.emitFloatingText(480, 180, `WARNING: ${boss.bossName} APPROACHING`, '#ff0055');
      }
    } else {
      // --- ENDLESS CYBER FORTRESS SECTOR TIMELINE ---
      if (timeline >= 1.0 && timeline < 1.05) {
        this.entities.spawnEnemy(new Enemy('gate_1', 1020, 270, 'LASER_GATE'));
        this.entities.spawnEnemy(new Enemy('scout_c1', 1080, 160, 'SCOUT'));
        this.entities.spawnEnemy(new Enemy('scout_c2', 1140, 380, 'SCOUT'));
      }
      if (timeline >= 6.5 && timeline < 6.55) {
        this.entities.spawnEnemy(new Enemy('turret_1', 990, 90, 'FORTRESS_TURRET'));
        this.entities.spawnEnemy(new Enemy('turret_2', 990, 450, 'FORTRESS_TURRET'));
        for (let i = 0; i < 3; i++) {
          this.entities.spawnEnemy(new Enemy(`swarmer_c${i}`, 1040 + i * 60, 270, 'SWARMER'));
        }
      }
      if (timeline >= 13.0 && timeline < 13.05) {
        this.entities.spawnEnemy(new Enemy('gate_2', 1000, 270, 'LASER_GATE'));
        this.entities.spawnEnemy(new Enemy('gate_3', 1180, 270, 'LASER_GATE'));
        this.entities.spawnEnemy(new Enemy('beetle_gold', 1090, 270, 'BEETLE', true));
      }
      if (timeline >= 21.0 && timeline < 21.05) {
        this.entities.spawnEnemy(new Enemy('turret_3', 990, 130, 'FORTRESS_TURRET'));
        this.entities.spawnEnemy(new Enemy('turret_4', 990, 410, 'FORTRESS_TURRET'));
        this.entities.spawnEnemy(new Enemy('tentacle_c1', 1050, 270, 'TENTACLE'));
      }
      if (timeline >= 28.5 && timeline < 28.55) {
        this.entities.spawnEnemy(new Enemy('gate_4', 1020, 270, 'LASER_GATE'));
        this.entities.spawnEnemy(new Enemy('beetle_c2', 1080, 180, 'BEETLE'));
        this.entities.spawnEnemy(new Enemy('beetle_c3', 1080, 360, 'BEETLE', true));
      }
      // Boss Sentinel
      if (timeline >= 36.0 && !this.bossSpawned) {
        this.bossSpawned = true;
        soundSynthesizer.setMusicTheme('BOSS');
        soundSynthesizer.playBossAlarm();
        const boss = new BossSentinel(820, 270);
        if (this.stageId > 2) {
          const mult = 1 + (this.stageId - 2) * 0.35;
          boss.maxHealth = Math.round(boss.maxHealth * mult);
          boss.health = boss.maxHealth;
          boss.bossName = `CORE SENTINEL OMEGA-V${this.stageId}`;
        }
        this.entities.setBoss(boss);
        this.particleSystem.emitFloatingText(480, 180, `ALERT: ${boss.bossName} DETECTED`, '#ff0033');
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
      230,
      `SECTOR ${this.stageId} CLEARED! +${sectorBonus.toLocaleString()} PTS`,
      '#00ff66'
    );
    this.particleSystem.emitFloatingText(
      480,
      270,
      `WARP TO SECTOR ${this.stageId + 1} ENGAGED`,
      '#00f0ff'
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
