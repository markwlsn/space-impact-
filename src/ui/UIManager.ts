import { GameState, StageId, HighScoreRecord } from '../types';
import { EntityManager } from '../core/EntityManager';
import { highScoreManager } from './HighScoreManager';
import { soundSynthesizer } from '../audio/SoundSynthesizer';

export interface UIActionCallbacks {
  onStartGame: () => void;
  onResumeGame: () => void;
  onRestartGame: () => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
}

export class UIManager {
  private width: number = 960;
  private height: number = 540;

  public showInstructions: boolean = false;
  public showLeaderboard: boolean = false;

  // High score entry state
  public isEnteringInitials: boolean = false;
  public enteredInitials: string[] = ['A', 'A', 'A'];
  public currentSlot: number = 0;
  public pendingScore: number = 0;
  public pendingStage: number = 1;

  private callbacks: UIActionCallbacks | null = null;
  private time: number = 0;

  constructor() {
    this.setupMouseListeners();
  }

  public setCallbacks(callbacks: UIActionCallbacks): void {
    this.callbacks = callbacks;
  }

  public update(dt: number): void {
    this.time += dt;
  }

  public startInitialsEntry(score: number, stage: number): void {
    if (highScoreManager.isHighScore(score)) {
      this.isEnteringInitials = true;
      this.pendingScore = score;
      this.pendingStage = stage;
      this.enteredInitials = ['A', 'A', 'A'];
      this.currentSlot = 0;
    }
  }

  public submitInitials(): void {
    const initials = this.enteredInitials.join('');
    highScoreManager.addScore(initials, this.pendingScore, this.pendingStage);
    this.isEnteringInitials = false;
    soundSynthesizer.playPowerup();
  }

  public cycleSlotChar(delta: number): void {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
    const char = this.enteredInitials[this.currentSlot];
    let idx = alphabet.indexOf(char);
    idx = (idx + delta + alphabet.length) % alphabet.length;
    this.enteredInitials[this.currentSlot] = alphabet[idx];
    soundSynthesizer.playUiBeep();
  }

  public moveSlot(delta: number): void {
    this.currentSlot = (this.currentSlot + delta + 3) % 3;
    soundSynthesizer.playUiBeep();
  }

  private setupMouseListeners(): void {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.handleClick(x, y);
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isEnteringInitials) return;

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        this.cycleSlotChar(1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.cycleSlotChar(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.moveSlot(1);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.moveSlot(-1);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        if (this.currentSlot < 2) {
          this.moveSlot(1);
        } else {
          this.submitInitials();
        }
      }
    });
  }

  public handleClick(x: number, y: number): void {
    soundSynthesizer.initAudioContext();

    // Initials entry slots interaction
    if (this.isEnteringInitials) {
      // Slot 0, 1, 2 hitboxes
      for (let s = 0; s < 3; s++) {
        const slotX = 420 + s * 45;
        if (x >= slotX - 18 && x <= slotX + 18 && y >= 250 && y <= 310) {
          this.currentSlot = s;
          this.cycleSlotChar(1);
          return;
        }
      }
      // Submit button hitbox
      if (x >= 400 && x <= 560 && y >= 340 && y <= 380) {
        this.submitInitials();
        return;
      }
    } else {
      this.callbacks?.onStartGame();
    }
  }

  // --- Rendering Functions ---

  public draw(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    stageId: StageId,
    stageProgress: number,
    entities: EntityManager,
    isTouchEnabled: boolean
  ): void {
    ctx.save();

    if (state === 'TITLE') {
      this.drawTitleScreen(ctx);
    } else if (state === 'PLAYING') {
      this.drawHUD(ctx, stageId, stageProgress, entities, isTouchEnabled);
    } else if (state === 'PAUSED') {
      this.drawHUD(ctx, stageId, stageProgress, entities, isTouchEnabled);
      this.drawPauseMenu(ctx);
    } else if (state === 'STAGE_WARP') {
      this.drawStageWarpScreen(ctx);
    } else if (state === 'GAME_OVER') {
      this.drawGameOverScreen(ctx, entities);
    } else if (state === 'VICTORY') {
      this.drawVictoryScreen(ctx, entities);
    }

    ctx.restore();
  }

  private drawTitleScreen(ctx: CanvasRenderingContext2D): void {
    // Translucent dark cyber panel
    ctx.fillStyle = 'rgba(5, 8, 17, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Nokia 3310 Tribute Banner
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText('--- NOKIA 3310 ARCHIVE // REMASTERED 2026 ---', this.width / 2, 85);

    // Main Title Logo
    ctx.font = 'bold 56px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.fillText('SPACE IMPACT', this.width / 2, 150);

    ctx.font = 'bold 20px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 12;
    ctx.fillText('// RETRO-FUTURISTIC VECTOR EDITION //', this.width / 2, 185);

    // Blinking Start Prompt
    const blink = Math.sin(this.time * 5) > 0;
    if (blink) {
      ctx.font = 'bold 24px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 15;
      ctx.fillText('[ PRESS SPACE OR CLICK TO DEPLOY ]', this.width / 2, 255);
    }

    // High Scores Hall of Fame
    ctx.font = 'bold 16px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('=== HALL OF FAME // TOP 5 ===', this.width / 2, 310);

    const scores = highScoreManager.getHighScores();
    ctx.font = '14px "Share Tech Mono", monospace';
    scores.forEach((rec: HighScoreRecord, idx: number) => {
      const rowY = 338 + idx * 24;
      ctx.fillStyle = idx === 0 ? '#ffea00' : '#e0f8ff';
      ctx.shadowColor = idx === 0 ? '#ffea00' : '#00f0ff';
      ctx.shadowBlur = idx === 0 ? 8 : 4;
      ctx.fillText(
        `#${idx + 1}  [${rec.initials}]  ${rec.score.toString().padStart(6, '0')} PTS  (STAGE ${rec.stage})`,
        this.width / 2,
        rowY
      );
    });

    // Controls Legend Footer
    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#8899aa';
    ctx.shadowBlur = 0;
    ctx.fillText(
      'CONTROLS: WASD / Arrows = Move  |  Space / Z = Laser  |  X / Shift = Secondary  |  Tab = Cycle  |  ESC = Pause',
      this.width / 2,
      495
    );
    ctx.fillText(
      'GAMEPAD: Left Stick / D-Pad = Move  |  A / X = Laser  |  B / Y = Secondary  |  Start = Pause',
      this.width / 2,
      515
    );
  }

  private drawHUD(
    ctx: CanvasRenderingContext2D,
    stageId: StageId,
    stageProgress: number,
    entities: EntityManager,
    isTouchEnabled: boolean
  ): void {
    ctx.save();
    ctx.textAlign = 'left';

    // Top HUD Bar background gradient
    const topGrad = ctx.createLinearGradient(0, 0, 0, 48);
    topGrad.addColorStop(0, 'rgba(3, 7, 18, 0.9)');
    topGrad.addColorStop(1, 'rgba(3, 7, 18, 0.0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, this.width, 48);

    // Score & High Score
    ctx.font = 'bold 18px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText(`SCORE: ${entities.score.toString().padStart(6, '0')}`, 25, 28);

    // Combo Multiplier
    if (entities.comboMultiplier > 1.0) {
      ctx.font = 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 10;
      ctx.fillText(`COMBO x${entities.comboMultiplier.toFixed(1)}!`, 210, 28);
    }

    // Stage Indicator & Progress Bar
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    const stageName = stageId === 1 ? 'STAGE 1: DEEP SPACE' : 'STAGE 2: CYBER FORTRESS';
    ctx.fillText(stageName, this.width / 2, 22);

    // Progress Bar
    const pBarW = 200;
    const pBarH = 6;
    const pBarX = this.width / 2 - pBarW / 2;
    const pBarY = 28;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(pBarX, pBarY, pBarW, pBarH);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(pBarX, pBarY, pBarW * Math.min(1.0, stageProgress), pBarH);

    // Touch overlay indicator
    ctx.textAlign = 'right';
    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = isTouchEnabled ? '#00ff66' : '#667788';
    ctx.fillText(isTouchEnabled ? '[TOUCH ON]' : '[TOUCH OFF]', this.width - 25, 28);

    // Bottom HUD Bar: Hull Integrity & Secondary Weapons
    const botGrad = ctx.createLinearGradient(0, this.height - 50, 0, this.height);
    botGrad.addColorStop(0, 'rgba(3, 7, 18, 0.0)');
    botGrad.addColorStop(1, 'rgba(3, 7, 18, 0.9)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, this.height - 50, this.width, 50);

    // Hull HP Bar
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('HULL:', 25, this.height - 20);

    const hpBarW = 160;
    const hpBarH = 14;
    const hpBarX = 75;
    const hpBarY = this.height - 32;
    const hpRatio = Math.max(0, entities.player.health / entities.player.maxHealth);

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    // Color gradient based on health
    ctx.fillStyle = hpRatio > 0.5 ? '#00ff66' : hpRatio > 0.25 ? '#ffea00' : '#ff0033';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(hpBarX + 2, hpBarY + 2, (hpBarW - 4) * hpRatio, hpBarH - 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillText(`${Math.ceil(entities.player.health)}%`, hpBarX + hpBarW + 10, this.height - 20);

    // Secondary Weapon & Ammo
    const player = entities.player;
    const activeSec = player.activeSecondary;
    const inv = player.inventory[activeSec];
    const secName =
      activeSec === 'MEGABOMB' ? 'MEGABOMB' : activeSec === 'BEAM_LASER' ? 'HYPER BEAM' : 'HOMING SALVO';
    const secColor =
      activeSec === 'MEGABOMB' ? '#ff0055' : activeSec === 'BEAM_LASER' ? '#00ffff' : '#ffaa00';

    ctx.textAlign = 'right';
    ctx.font = 'bold 15px "Share Tech Mono", monospace';
    ctx.fillStyle = secColor;
    ctx.shadowColor = secColor;
    ctx.shadowBlur = 8;
    ctx.fillText(`SPECIAL [TAB]: ${secName} x${inv.ammo}`, this.width - 25, this.height - 20);

    // Boss Health Bar (if boss present)
    if (entities.boss && !entities.boss.isDead) {
      const boss = entities.boss;
      const bRatio = Math.max(0, boss.health / boss.maxHealth);
      const bBarW = 440;
      const bBarH = 12;
      const bBarX = this.width / 2 - bBarW / 2;
      const bBarY = 48;

      ctx.textAlign = 'center';
      ctx.font = 'bold 14px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;
      ctx.fillText(`WARNING // ${boss.bossName} [PHASE ${boss.getPhase()}]`, this.width / 2, bBarY - 4);

      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);

      ctx.fillStyle = '#ff0055';
      ctx.fillRect(bBarX + 2, bBarY + 2, (bBarW - 4) * bRatio, bBarH - 4);
    }

    ctx.restore();
  }

  private drawPauseMenu(ctx: CanvasRenderingContext2D): void {
    // Dark modal overlay
    ctx.fillStyle = 'rgba(5, 8, 17, 0.82)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 42px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.fillText('GAME PAUSED', this.width / 2, 200);

    ctx.font = 'bold 20px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillText('[ PRESS ESC / P TO RESUME ]', this.width / 2, 270);
    ctx.fillText('[ PRESS R TO RESTART MISSION ]', this.width / 2, 315);
    ctx.fillText('[ PRESS M TO TOGGLE AUDIO MUTE ]', this.width / 2, 360);
  }

  private drawStageWarpScreen(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';

    // Flashing hyperspace banner
    const pulse = Math.sin(this.time * 8) > 0;
    ctx.font = 'bold 46px "Share Tech Mono", monospace';
    ctx.fillStyle = pulse ? '#ffffff' : '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;
    ctx.fillText('HYPERSPACE WARP ENGAGED', this.width / 2, 230);

    ctx.font = 'bold 24px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 15;
    ctx.fillText('ENTERING THE CYBER FORTRESS...', this.width / 2, 290);
  }

  private drawGameOverScreen(ctx: CanvasRenderingContext2D, entities: EntityManager): void {
    ctx.fillStyle = 'rgba(10, 2, 8, 0.9)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 50px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 24;
    ctx.fillText('MISSION FAILED', this.width / 2, 130);

    ctx.font = '20px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillText(`FINAL SCORE: ${entities.score} PTS`, this.width / 2, 185);
    ctx.fillText(`ENEMIES ELIMINATED: ${entities.enemiesDestroyed}`, this.width / 2, 215);
    ctx.fillText(`PEAK COMBO: x${entities.maxCombo.toFixed(1)}`, this.width / 2, 245);

    if (this.isEnteringInitials) {
      this.drawInitialsEntry(ctx);
    } else {
      const blink = Math.sin(this.time * 5) > 0;
      if (blink) {
        ctx.font = 'bold 24px "Share Tech Mono", monospace';
        ctx.fillStyle = '#00ff66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 15;
        ctx.fillText('[ PRESS SPACE OR CLICK TO RETRY ]', this.width / 2, 380);
      }
    }
  }

  private drawVictoryScreen(ctx: CanvasRenderingContext2D, entities: EntityManager): void {
    ctx.fillStyle = 'rgba(3, 12, 22, 0.92)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 25;
    ctx.fillText('VICTORY ACHIEVED!', this.width / 2, 120);

    ctx.font = 'bold 22px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.fillText('CYBER FORTRESS CORE NEUTRALIZED', this.width / 2, 160);

    ctx.font = '19px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillText(`TOTAL SCORE: ${entities.score} PTS`, this.width / 2, 205);
    ctx.fillText(`ENEMIES DESTROYED: ${entities.enemiesDestroyed}`, this.width / 2, 235);
    ctx.fillText(`MAX COMBO MULTIPLIER: x${entities.maxCombo.toFixed(1)}`, this.width / 2, 265);

    if (this.isEnteringInitials) {
      this.drawInitialsEntry(ctx);
    } else {
      const blink = Math.sin(this.time * 5) > 0;
      if (blink) {
        ctx.font = 'bold 24px "Share Tech Mono", monospace';
        ctx.fillStyle = '#00ff66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 15;
        ctx.fillText('[ PRESS SPACE TO PLAY AGAIN ]', this.width / 2, 400);
      }
    }
  }

  private drawInitialsEntry(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';

    ctx.font = 'bold 22px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 14;
    ctx.fillText('★ NEW HIGH SCORE! ENTER INITIALS ★', this.width / 2, 290);

    // 3 arcade letter slots
    for (let i = 0; i < 3; i++) {
      const slotX = 420 + i * 45;
      const isSelected = i === this.currentSlot;

      ctx.strokeStyle = isSelected ? '#ffea00' : '#445566';
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeRect(slotX - 18, 305, 36, 44);

      ctx.font = 'bold 30px "Share Tech Mono", monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : '#8899aa';
      ctx.shadowColor = isSelected ? '#ffea00' : 'transparent';
      ctx.shadowBlur = isSelected ? 12 : 0;
      ctx.fillText(this.enteredInitials[i], slotX, 338);

      if (isSelected) {
        // Arrow hints
        ctx.fillStyle = '#ffea00';
        ctx.font = '16px "Share Tech Mono", monospace';
        ctx.fillText('▲', slotX, 300);
        ctx.fillText('▼', slotX, 365);
      }
    }

    ctx.font = '14px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.fillText('Use UP/DOWN/LEFT/RIGHT or Click Slot, then ENTER to Submit', this.width / 2, 395);

    ctx.restore();
  }
}
