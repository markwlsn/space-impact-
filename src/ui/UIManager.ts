import { GameState, StageId, HighScoreRecord } from '../types';
import { EntityManager } from '../core/EntityManager';
import { highScoreManager } from './HighScoreManager';
import { soundSynthesizer } from '../audio/SoundSynthesizer';
import { shopManager } from './ShopManager';

export interface UIActionCallbacks {
  onStartGame: () => void;
  onResumeGame: () => void;
  onRestartGame: () => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onSkipIntro: () => void;
  onConfirmPilot: (pilot: string) => void;
  onOpenShop?: () => void;
  onCloseShop?: () => void;
}

interface KeypadButton {
  label: string;
  char: string;
  x: number;
  y: number;
  w: number;
  h: number;
  action: 'char' | 'del' | 'clear' | 'launch';
}

export class UIManager {
  private width: number = 960;
  private height: number = 540;

  public currentState: GameState = 'CINEMATIC_INTRO';
  public introTimer: number = 0;
  public pilotInput: string = 'PILOT_1';
  public cursorBlink: number = 0;

  public showInstructions: boolean = false;
  public showLeaderboard: boolean = false;

  // Shop state
  public selectedShopShipIndex: number = 0;
  private previousState: GameState = 'TITLE';

  private callbacks: UIActionCallbacks | null = null;
  private time: number = 0;

  constructor() {
    this.pilotInput = highScoreManager.getPilotName() || 'PILOT_1';
    this.setupMouseListeners();
  }

  public setCallbacks(callbacks: UIActionCallbacks): void {
    this.callbacks = callbacks;
  }

  public openShop(): void {
    this.previousState = this.currentState;
    this.currentState = 'SHOP';
    this.callbacks?.onOpenShop?.();
    soundSynthesizer.playUiBeep();
  }

  public closeShop(): void {
    this.currentState = this.previousState === 'PAUSED' ? 'PAUSED' : 'TITLE';
    this.callbacks?.onCloseShop?.();
    soundSynthesizer.playUiBeep();
  }

  public actOnSelectedShip(): void {
    const ships = shopManager.getAllShips();
    const ship = ships[this.selectedShopShipIndex];
    if (!ship) return;

    if (shopManager.isShipUnlocked(ship.id)) {
      shopManager.equipShip(ship.id);
      soundSynthesizer.playPowerup();
    } else {
      if (shopManager.unlockShip(ship.id)) {
        soundSynthesizer.playCoinInsert();
      } else {
        soundSynthesizer.playDamage();
      }
    }
  }

  public update(dt: number): void {
    this.time += dt;
    this.cursorBlink += dt;
    if (this.currentState === 'CINEMATIC_INTRO') {
      this.introTimer += dt;
    }
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
      if (this.currentState === 'CINEMATIC_INTRO') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
          e.preventDefault();
          this.callbacks?.onSkipIntro();
        }
        return;
      }

      if (this.currentState === 'PILOT_ENTRY') {
        if (e.key.length === 1 && /[a-zA-Z0-9_-]/.test(e.key)) {
          e.preventDefault();
          if (this.pilotInput.length < 10) {
            this.pilotInput += e.key.toUpperCase();
            soundSynthesizer.playTypewriterClick();
          }
        } else if (e.code === 'Backspace') {
          e.preventDefault();
          if (this.pilotInput.length > 0) {
            this.pilotInput = this.pilotInput.slice(0, -1);
            soundSynthesizer.playTypewriterClick();
          }
        } else if (e.code === 'Enter') {
          e.preventDefault();
          this.confirmPilot();
        }
        return;
      }

      if (this.currentState === 'SHOP') {
        const ships = shopManager.getAllShips();
        if (e.code === 'Escape') {
          e.preventDefault();
          this.closeShop();
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          this.selectedShopShipIndex = (this.selectedShopShipIndex - 1 + ships.length) % ships.length;
          soundSynthesizer.playUiBeep();
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          e.preventDefault();
          this.selectedShopShipIndex = (this.selectedShopShipIndex + 1) % ships.length;
          soundSynthesizer.playUiBeep();
        } else if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.actOnSelectedShip();
        }
        return;
      }

      if ((this.currentState === 'TITLE' || this.currentState === 'PAUSED') && e.code === 'KeyH') {
        e.preventDefault();
        this.openShop();
        return;
      }

      if (this.currentState === 'TITLE' && e.code === 'KeyI') {
        this.currentState = 'CINEMATIC_INTRO';
        this.introTimer = 0;
        return;
      }
    });
  }

  public handleClick(x: number, y: number): void {
    soundSynthesizer.initAudioContext();

    if (this.currentState === 'CINEMATIC_INTRO') {
      this.callbacks?.onSkipIntro();
      return;
    }

    if (this.currentState === 'PILOT_ENTRY') {
      const keys = this.getVirtualKeypad();
      for (const k of keys) {
        if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) {
          if (k.action === 'char') {
            if (this.pilotInput.length < 10) {
              this.pilotInput += k.char;
              soundSynthesizer.playTypewriterClick();
            }
          } else if (k.action === 'del') {
            if (this.pilotInput.length > 0) {
              this.pilotInput = this.pilotInput.slice(0, -1);
              soundSynthesizer.playTypewriterClick();
            }
          } else if (k.action === 'clear') {
            this.pilotInput = '';
            soundSynthesizer.playTypewriterClick();
          } else if (k.action === 'launch') {
            this.confirmPilot();
          }
          return;
        }
      }
      return;
    }

    if (this.currentState === 'SHOP') {
      this.handleShopClick(x, y);
      return;
    }

    if (this.currentState === 'TITLE') {
      // Check if clicking Hangar / Shop button [x: 290-670, y: 265-305]
      if (x >= 280 && x <= 680 && y >= 265 && y <= 305) {
        this.openShop();
        return;
      }
      this.callbacks?.onStartGame();
      return;
    }

    if (this.currentState === 'PAUSED') {
      // Check if clicking Hangar / Shop button [x: 290-670, y: 325-365]
      if (x >= 280 && x <= 680 && y >= 325 && y <= 365) {
        this.openShop();
        return;
      }
      return;
    }

    if (this.currentState === 'GAME_OVER' || this.currentState === 'VICTORY') {
      this.callbacks?.onStartGame();
      return;
    }

    // CRITICAL BUG FIX: In 'PLAYING', do NOT reset the game! Mouse clicks during gameplay do nothing to game lifecycle.
  }

  private handleShopClick(x: number, y: number): void {
    const ships = shopManager.getAllShips();

    // 1. Ship catalog list cards (left column: x = 35 to 365)
    for (let i = 0; i < ships.length; i++) {
      const cardY = 80 + i * 78;
      if (x >= 35 && x <= 365 && y >= cardY && y <= cardY + 70) {
        this.selectedShopShipIndex = i;
        soundSynthesizer.playUiBeep();
        return;
      }
    }

    // 2. Action Buy / Equip button (x = 440 to 870, y = 435 to 485)
    if (x >= 440 && x <= 870 && y >= 435 && y <= 485) {
      this.actOnSelectedShip();
      return;
    }

    // 3. Return button (x = 35 to 200, y = 485 to 520)
    if (x >= 35 && x <= 200 && y >= 485 && y <= 520) {
      this.closeShop();
      return;
    }
  }

  public confirmPilot(): void {
    const clean = this.pilotInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 10) || 'PILOT_1';
    this.pilotInput = clean;
    highScoreManager.setPilotName(clean);
    soundSynthesizer.playCoinInsert();
    this.callbacks?.onConfirmPilot(clean);
  }

  private getVirtualKeypad(): KeypadButton[] {
    const keys: KeypadButton[] = [];
    const startY = 270;
    const startX = 223;

    // Row 1: A-M
    const row1 = 'ABCDEFGHIJKLM'.split('');
    row1.forEach((char, i) => {
      keys.push({ label: char, char, x: startX + i * 40, y: startY, w: 34, h: 32, action: 'char' });
    });

    // Row 2: N-Z
    const row2 = 'NOPQRSTUVWXYZ'.split('');
    row2.forEach((char, i) => {
      keys.push({ label: char, char, x: startX + i * 40, y: startY + 40, w: 34, h: 32, action: 'char' });
    });

    // Row 3: Digits + punctuation
    const row3 = '0123456789-_'.split('');
    const startX3 = 243;
    row3.forEach((char, i) => {
      keys.push({ label: char, char, x: startX3 + i * 40, y: startY + 80, w: 34, h: 32, action: 'char' });
    });

    // Row 4: Controls & Deploy
    keys.push({ label: '⌫ DEL', char: '', x: 223, y: startY + 122, w: 90, h: 36, action: 'del' });
    keys.push({ label: 'CLEAR', char: '', x: 323, y: startY + 122, w: 90, h: 36, action: 'clear' });
    keys.push({
      label: '★ INSERT COIN / DEPLOY >>',
      char: '',
      x: 423,
      y: startY + 122,
      w: 314,
      h: 36,
      action: 'launch',
    });

    return keys;
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
    this.currentState = state;
    ctx.save();

    if (state === 'CINEMATIC_INTRO') {
      this.drawCinematicIntro(ctx);
    } else if (state === 'PILOT_ENTRY') {
      this.drawPilotRegistration(ctx);
    } else if (state === 'TITLE') {
      this.drawTitleScreen(ctx);
    } else if (state === 'SHOP') {
      this.drawShopModal(ctx);
    } else if (state === 'PLAYING') {
      this.drawHUD(ctx, stageId, stageProgress, entities, isTouchEnabled);
    } else if (state === 'PAUSED') {
      this.drawHUD(ctx, stageId, stageProgress, entities, isTouchEnabled);
      this.drawPauseMenu(ctx);
    } else if (state === 'STAGE_WARP') {
      this.drawStageWarpScreen(ctx, stageId);
    } else if (state === 'GAME_OVER') {
      this.drawGameOverScreen(ctx, entities, stageId);
    } else if (state === 'VICTORY') {
      this.drawVictoryScreen(ctx, entities);
    }

    ctx.restore();
  }

  /**
   * Procedural 3D rotating starfighter wireframe projection
   */
  private drawWireframeShip(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    scale: number,
    rotY: number,
    pitch: number = 0.2
  ): void {
    ctx.save();

    const rawVertices: [number, number, number][] = [
      [36, 0, 0],     // 0: Nose tip
      [14, 8, -5],    // 1: Cockpit top left
      [14, -8, -5],   // 2: Cockpit top right
      [-12, 14, -6],  // 3: Fuselage mid left
      [-12, -14, -6], // 4: Fuselage mid right
      [-8, 52, 0],    // 5: Left wingtip
      [-8, -52, 0],   // 6: Right wingtip
      [-36, 12, 14],  // 7: Left tail fin
      [-36, -12, 14], // 8: Right tail fin
      [-30, 0, 0],    // 9: Engine nozzle
      [-18, 28, 4],   // 10: Left cannon pod
      [-18, -28, 4],  // 11: Right cannon pod
    ];

    const edges: [number, number][] = [
      [0, 1], [0, 2], [1, 2],
      [1, 3], [2, 4], [3, 4],
      [3, 5], [4, 6], [5, 9], [6, 9],
      [3, 7], [4, 8], [7, 8], [7, 9], [8, 9],
      [5, 10], [6, 11], [10, 9], [11, 9],
      [0, 9],
    ];

    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);

    const projected: { x: number; y: number; z: number }[] = rawVertices.map(([vx, vy, vz]) => {
      const y1 = vy * cosP - vz * sinP;
      const z1 = vy * sinP + vz * cosP;
      const x2 = vx * cosY + z1 * sinY;
      const z2 = -vx * sinY + z1 * cosY;
      const dist = 240;
      const f = dist / (dist + z2);
      return {
        x: cx + x2 * scale * f,
        y: cy + y1 * scale * f,
        z: z2,
      };
    });

    // Plasma thruster backflare
    const p9 = projected[9];
    const thrustGlow = ctx.createRadialGradient(p9.x - 12, p9.y, 2, p9.x - 12, p9.y, 22);
    thrustGlow.addColorStop(0, 'rgba(0, 255, 255, 0.9)');
    thrustGlow.addColorStop(0.5, 'rgba(0, 150, 255, 0.4)');
    thrustGlow.addColorStop(1, 'rgba(0, 0, 255, 0)');
    ctx.fillStyle = thrustGlow;
    ctx.beginPath();
    ctx.arc(p9.x - 12, p9.y, 22, 0, Math.PI * 2);
    ctx.fill();

    // Wireframe edges
    ctx.lineWidth = 1.8;
    edges.forEach(([i, j]) => {
      const pA = projected[i];
      const pB = projected[j];
      const avgZ = (pA.z + pB.z) / 2;
      const alpha = Math.max(0.35, Math.min(1.0, 0.75 - avgZ * 0.012));

      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    });

    // Vertex points
    projected.forEach((p, idx) => {
      ctx.fillStyle = idx === 0 ? '#ff0055' : idx === 9 ? '#00ffff' : '#ffffff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * 30-Second Retro Cinematic Intro:
   * 0-5s:   Nokia 3310 HEX ROM Decompression & Zero-Asset Audit
   * 5-14s:  Developer Reveal: Mark Wilson (@markwlsn) tribute & fanmade dedication
   * 14-22s: 3D Rotating Starfighter Vector Blueprint & Diagnostics
   * 22-27s: Monumental Title Climax Drop
   * 27-30s: Countdown & Seamless Dispatch to Pilot Entry
   */
  private drawCinematicIntro(ctx: CanvasRenderingContext2D): void {
    const t = this.introTimer;

    // Background cosmic space
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, this.width, this.height);

    // CRT vector grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // --- PHASE 1 (0.0s - 5.0s): CRT BOOT & NOKIA 3310 HEX DECOMPRESSION ---
    if (t < 5.0) {
      if (t < 0.6) {
        const flashProgress = t / 0.6;
        const lineH = flashProgress * this.height;
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - flashProgress * 0.7})`;
        ctx.fillRect(0, this.height / 2 - lineH / 2, this.width, lineH);
      }

      const boxW = 760;
      const boxH = 320;
      const boxX = this.width / 2 - boxW / 2;
      const boxY = this.height / 2 - boxH / 2;

      ctx.fillStyle = 'rgba(2, 14, 10, 0.88)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 10;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.font = 'bold 15px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.textAlign = 'left';
      ctx.fillText('/// NOKIA 3310 RETRO BIOS v3.3.10 /// INITIALIZING PROCEDURAL CORE ///', boxX + 20, boxY + 35);

      ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
      ctx.beginPath();
      ctx.moveTo(boxX + 20, boxY + 48);
      ctx.lineTo(boxX + boxW - 20, boxY + 48);
      ctx.stroke();

      const lines = [
        { text: '>> 0x0000: MOUNTING FLASH MEMORY ARCHIVE (YEAR 2000)... [OK]', start: 0.6 },
        { text: '>> 0x001A: EXTRACTING "SPACE IMPACT" MONOCHROME ROM MATRIX... [OK]', start: 1.4 },
        { text: '>> 0x003F: CONVERTING 84x48 MONOCHROME BITMAPS TO 60FPS VECTOR PIPELINE... [DONE]', start: 2.2 },
        { text: '>> 0x0082: ZERO EXTERNAL ASSET POLICY: PURE PROCEDURAL CANVAS 2D CODEBASE', start: 3.0 },
        { text: '>> 0x00C4: SYNTHESIZING NATIVE WEB AUDIO OSCILLATORS... SYSTEM ARMED & READY', start: 3.8 },
      ];

      ctx.font = '14px "Share Tech Mono", monospace';
      lines.forEach((line, idx) => {
        if (t >= line.start) {
          const charCount = Math.floor((t - line.start) * 45);
          const displayed = line.text.slice(0, charCount);
          ctx.fillStyle = '#00ff88';
          ctx.shadowBlur = 6;
          ctx.fillText(displayed, boxX + 25, boxY + 85 + idx * 36);
        }
      });

      if (Math.sin(this.time * 8) > 0) {
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(boxX + 25, boxY + 275, 12, 18);
      }
    }

    // --- PHASE 2 (5.0s - 14.0s): DEVELOPER TRIBUTE — MARKWLSN ---
    else if (t >= 5.0 && t < 14.0) {
      const phaseT = t - 5.0;
      const fadeIn = Math.min(1.0, phaseT / 0.8);
      ctx.save();
      ctx.globalAlpha = fadeIn;

      const radial = ctx.createRadialGradient(this.width / 2, 230, 20, this.width / 2, 230, 320);
      radial.addColorStop(0, 'rgba(0, 240, 255, 0.16)');
      radial.addColorStop(0.6, 'rgba(255, 0, 85, 0.08)');
      radial.addColorStop(1, 'rgba(3, 7, 18, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 12;
      ctx.fillText('★ SPECIAL DEDICATION // RETRO REMASTER MISSION ★', this.width / 2, 85);

      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillStyle = '#88ccff';
      ctx.shadowBlur = 6;
      ctx.fillText('DEVELOPED BY', this.width / 2, 122);

      ctx.font = 'bold 44px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;
      ctx.fillText('M A R K W I L S O N', this.width / 2, 168);

      ctx.font = 'bold 22px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillText('[@markwlsn]', this.width / 2, 202);

      const msgW = 740;
      const msgH = 190;
      const msgX = this.width / 2 - msgW / 2;
      const msgY = 235;

      ctx.fillStyle = 'rgba(5, 12, 28, 0.9)';
      ctx.fillRect(msgX, msgY, msgW, msgH);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(msgX, msgY, msgW, msgH);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffea00';
      const bLen = 16;
      ctx.beginPath(); ctx.moveTo(msgX, msgY + bLen); ctx.lineTo(msgX, msgY); ctx.lineTo(msgX + bLen, msgY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(msgX + msgW - bLen, msgY); ctx.lineTo(msgX + msgW, msgY); ctx.lineTo(msgX + msgW, msgY + bLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(msgX, msgY + msgH - bLen); ctx.lineTo(msgX, msgY + msgH); ctx.lineTo(msgX + bLen, msgY + msgH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(msgX + msgW - bLen, msgY + msgH); ctx.lineTo(msgX + msgW, msgY + msgH); ctx.lineTo(msgX + msgW, msgY + msgH - bLen); ctx.stroke();

      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillText('"This is a fanmade game that aims to innovate and remaster old games."', this.width / 2, msgY + 45);

      ctx.font = '16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#88ddff';
      ctx.shadowBlur = 4;
      ctx.fillText('Crafted with pure Canvas 2D vectors and Web Audio API synthesis.', this.width / 2, msgY + 80);
      ctx.fillText('Bringing the iconic monochrome Nokia 3310 legend into modern web performance.', this.width / 2, msgY + 110);

      ctx.font = 'bold 20px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 12;
      ctx.fillText('♥  HOPE YOU LIKE IT!  — markwlsn  ♥', this.width / 2, msgY + 155);

      ctx.restore();
    }

    // --- PHASE 3 (14.0s - 22.0s): 3D WIREFRAME STARFIGHTER SCHEMATICS ---
    else if (t >= 14.0 && t < 22.0) {
      const phaseT = t - 14.0;
      const fadeIn = Math.min(1.0, phaseT / 0.6);
      ctx.save();
      ctx.globalAlpha = fadeIn;

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillText('// MK-IV RETRO VECTOR STARFIGHTER // PROCEDURAL SCHEMATICS //', this.width / 2, 75);

      const rotY = this.time * 1.6;
      const pitch = 0.25 + Math.sin(this.time * 2) * 0.1;
      this.drawWireframeShip(ctx, this.width / 2, 260, 3.4, rotY, pitch);

      // Left Telemetry Box
      const leftX = 40;
      const leftY = 120;
      const boxW = 230;
      const boxH = 260;
      ctx.fillStyle = 'rgba(5, 10, 24, 0.85)';
      ctx.fillRect(leftX, leftY, boxW, boxH);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(leftX, leftY, boxW, boxH);

      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('HULL TELEMETRY', leftX + 15, leftY + 30);

      const tLines = [
        'DESIGNATION: MK-IV VIPER',
        'CLASS: VECTOR INTERCEPTOR',
        'PROPULSION: ION THRUSTER',
        'RENDER: PROCEDURAL 60FPS',
        'COLLISION: EARS BOUNDS',
        'AUDIO: DYNAMIC SYNTH',
        'ASSETS: ZERO EXTERNAL',
      ];
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.fillStyle = '#88ccff';
      tLines.forEach((tl, idx) => {
        ctx.fillText(tl, leftX + 15, leftY + 65 + idx * 26);
      });

      // Right Diagnostic Box
      const rightX = this.width - 270;
      const rightY = 120;
      ctx.fillStyle = 'rgba(5, 10, 24, 0.85)';
      ctx.fillRect(rightX, rightY, boxW, boxH);
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 1;
      ctx.strokeRect(rightX, rightY, boxW, boxH);

      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.fillText('WEAPONS STATUS', rightX + 15, rightY + 30);

      const wLines = [
        '[x] DUAL LASERS     : OK',
        '[x] MEGABOMB        : ARMED',
        '[x] HYPER BEAM      : READY',
        '[x] HOMING MISSILES : READY',
        '[x] SHIELD CORES    : 100%',
        '[x] CRITICAL IMPACT : PRIMED',
        '[x] SECTOR LINK     : ACTIVE',
      ];
      ctx.font = '12px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ff88aa';
      wLines.forEach((wl, idx) => {
        ctx.fillText(wl, rightX + 15, rightY + 65 + idx * 26);
      });

      ctx.restore();
    }

    // --- PHASE 4 (22.0s - 27.5s): TITLE CLIMAX DROP ---
    else if (t >= 22.0 && t < 27.5) {
      const phaseT = t - 22.0;

      const ringRadius = phaseT * 280;
      ctx.strokeStyle = `rgba(0, 240, 255, ${Math.max(0, 1 - phaseT / 2.5)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.width / 2, 230, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillText('--- NOKIA 3310 RETRO REMASTER ---', this.width / 2, 130);

      ctx.font = 'bold 64px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 28;
      ctx.fillText('SPACE IMPACT', this.width / 2, 210);

      ctx.font = 'bold 24px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 16;
      ctx.fillText('// RETRO-FUTURISTIC VECTOR EDITION //', this.width / 2, 260);

      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 12;
      ctx.fillText('ENDLESS SECTORS  •  LIVE ARCADE PLACEMENT  •  PURE CODE', this.width / 2, 310);

      ctx.font = '16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#88ccdd';
      ctx.shadowBlur = 4;
      ctx.fillText('Tribute Developed by Mark Wilson (@markwlsn)', this.width / 2, 360);
    }

    // --- PHASE 5 (27.5s - 30.0s): PILOT REGISTRATION HANDOFF ---
    else if (t >= 27.5) {
      const countdown = Math.max(0, 30.0 - t).toFixed(1);

      ctx.textAlign = 'center';
      ctx.font = 'bold 22px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 14;
      ctx.fillText('>> MISSION CONTROL: PILOT IDENTIFICATION REQUIRED <<', this.width / 2, 200);

      ctx.font = 'bold 48px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.fillText(`ENTERING TERMINAL IN ${countdown}s`, this.width / 2, 270);

      ctx.font = 'bold 18px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.shadowBlur = 8;
      ctx.fillText('PREPARE TO LOG YOUR PILOT CALLSIGN', this.width / 2, 330);
    }

    // --- PERSISTENT SKIP BUTTON (TOP RIGHT) ---
    const skipX = 750;
    const skipY = 18;
    const skipW = 185;
    const skipH = 46;

    const pulseSkip = Math.sin(this.time * 6) > 0;
    ctx.fillStyle = 'rgba(5, 12, 30, 0.85)';
    ctx.fillRect(skipX, skipY, skipW, skipH);
    ctx.strokeStyle = pulseSkip ? '#00f0ff' : '#0088bb';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = pulseSkip ? 10 : 4;
    ctx.strokeRect(skipX, skipY, skipW, skipH);

    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SKIP INTRO >>', skipX + skipW / 2, skipY + 22);

    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ff66';
    ctx.shadowBlur = 0;
    ctx.fillText('[ SPACE OR CLICK ]', skipX + skipW / 2, skipY + 38);

    // Timeline Progress bar
    const pW = this.width - 80;
    const pH = 4;
    const pX = 40;
    const pY = this.height - 18;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(pX, pY, pW, pH);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(pX, pY, pW * Math.min(1.0, t / 30.0), pH);
  }

  /**
   * 80s - 90s Arcade Pilot Callsign / Username Entry Screen
   */
  private drawPilotRegistration(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(5, 8, 20, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText('=== 80s - 90s ARCADE PILOT REGISTRATION ===', this.width / 2, 45);

    ctx.font = 'bold 28px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.fillText('IDENTIFY YOURSELF, PILOT', this.width / 2, 85);

    ctx.font = '15px "Share Tech Mono", monospace';
    ctx.fillStyle = '#88ccff';
    ctx.shadowBlur = 4;
    ctx.fillText('ENTER YOUR CALLSIGN TO LOG YOUR RUN ON THE GLOBAL SECTOR LEADERBOARD', this.width / 2, 115);

    // Callsign Box
    const callsignBoxW = 440;
    const callsignBoxH = 55;
    const callsignBoxX = this.width / 2 - callsignBoxW / 2;
    const callsignBoxY = 135;

    ctx.fillStyle = 'rgba(2, 10, 25, 0.9)';
    ctx.fillRect(callsignBoxX, callsignBoxY, callsignBoxW, callsignBoxH);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 14;
    ctx.strokeRect(callsignBoxX, callsignBoxY, callsignBoxW, callsignBoxH);

    // Corner decorative markers
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffea00';
    const mSize = 10;
    ctx.beginPath(); ctx.moveTo(callsignBoxX, callsignBoxY + mSize); ctx.lineTo(callsignBoxX, callsignBoxY); ctx.lineTo(callsignBoxX + mSize, callsignBoxY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(callsignBoxX + callsignBoxW - mSize, callsignBoxY); ctx.lineTo(callsignBoxX + callsignBoxW, callsignBoxY); ctx.lineTo(callsignBoxX + callsignBoxW, callsignBoxY + mSize); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(callsignBoxX, callsignBoxY + callsignBoxH - mSize); ctx.lineTo(callsignBoxX, callsignBoxY + callsignBoxH); ctx.lineTo(callsignBoxX + mSize, callsignBoxY + callsignBoxH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(callsignBoxX + callsignBoxW - mSize, callsignBoxY + callsignBoxH); ctx.lineTo(callsignBoxX + callsignBoxW, callsignBoxY + callsignBoxH); ctx.lineTo(callsignBoxX + callsignBoxW, callsignBoxY + callsignBoxH - mSize); ctx.stroke();

    const cursor = Math.sin(this.cursorBlink * 6) > 0 ? '_' : ' ';
    const displayText = (this.pilotInput || '') + cursor;

    ctx.font = 'bold 28px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 12;
    ctx.fillText(`CALLSIGN: [ ${displayText} ]`, this.width / 2, callsignBoxY + 38);

    // Rotating mini wireframe ships
    this.drawWireframeShip(ctx, callsignBoxX - 85, callsignBoxY + 28, 1.5, this.time * 2.0, 0.2);
    this.drawWireframeShip(ctx, callsignBoxX + callsignBoxW + 85, callsignBoxY + 28, 1.5, -this.time * 2.0, 0.2);

    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#88aacc';
    ctx.shadowBlur = 0;
    ctx.fillText('Type on keyboard or tap virtual keys below. Max 10 characters.', this.width / 2, 215);

    // Virtual On-Screen Keypad
    const keys = this.getVirtualKeypad();
    keys.forEach((k) => {
      ctx.fillStyle = k.action === 'launch' ? 'rgba(0, 255, 102, 0.2)' : 'rgba(10, 25, 50, 0.85)';
      ctx.fillRect(k.x, k.y, k.w, k.h);

      ctx.strokeStyle = k.action === 'launch' ? '#00ff66' : '#00f0ff';
      ctx.lineWidth = k.action === 'launch' ? 2 : 1;
      ctx.shadowColor = k.action === 'launch' ? '#00ff66' : '#00f0ff';
      ctx.shadowBlur = k.action === 'launch' ? 10 : 4;
      ctx.strokeRect(k.x, k.y, k.w, k.h);

      ctx.textAlign = 'center';
      ctx.font = k.action === 'launch' ? 'bold 15px "Share Tech Mono", monospace' : 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = k.action === 'launch' ? '#00ff66' : '#ffffff';
      ctx.fillText(k.label, k.x + k.w / 2, k.y + k.h / 2 + 5);
    });

    ctx.font = 'bold 14px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 8;
    ctx.fillText('★ CURRENT ARCADE RECORD: #1 MARKWLSN (99,990 PTS) — CAN YOU SURPASS THE DEVELOPER? ★', this.width / 2, 485);

    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#8899aa';
    ctx.shadowBlur = 0;
    ctx.fillText('Press ENTER or click [INSERT COIN / DEPLOY] to begin endless sector assault.', this.width / 2, 515);
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
      ctx.font = 'bold 22px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 15;
      ctx.fillText('[ PRESS SPACE OR CLICK TO DEPLOY ]', this.width / 2, 235);
    }

    // Interactive Hangar / Ship Shop Button
    const shopBtnX = this.width / 2 - 200;
    const shopBtnY = 255;
    const shopBtnW = 400;
    const shopBtnH = 36;
    ctx.fillStyle = 'rgba(10, 24, 48, 0.9)';
    ctx.fillRect(shopBtnX, shopBtnY, shopBtnW, shopBtnH);
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 8;
    ctx.strokeRect(shopBtnX, shopBtnY, shopBtnW, shopBtnH);

    ctx.font = 'bold 15px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 6;
    ctx.fillText('★ [H] SPACESHIP HANGAR & FLEET REQUISITIONS ★', this.width / 2, shopBtnY + 23);

    const equipped = shopManager.getEquippedShip();
    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#88ddff';
    ctx.shadowBlur = 0;
    ctx.fillText(`VESSEL: ${equipped.name}  |  CREDITS: ✪ ${shopManager.getGold()}`, this.width / 2, 312);

    // High Scores Hall of Fame
    ctx.font = 'bold 15px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('=== HALL OF FAME // TOP 5 ===', this.width / 2, 342);

    const scores = highScoreManager.getHighScores();
    ctx.font = '13px "Share Tech Mono", monospace';
    scores.forEach((rec: HighScoreRecord, idx: number) => {
      const rowY = 366 + idx * 22;
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

  /**
   * HUD with live rank tracker, live placement mini-ticker, and endless sector progression
   */
  private drawHUD(
    ctx: CanvasRenderingContext2D,
    stageId: StageId,
    stageProgress: number,
    entities: EntityManager,
    isTouchEnabled: boolean
  ): void {
    ctx.save();
    ctx.textAlign = 'left';

    const topGrad = ctx.createLinearGradient(0, 0, 0, 52);
    topGrad.addColorStop(0, 'rgba(3, 7, 18, 0.92)');
    topGrad.addColorStop(1, 'rgba(3, 7, 18, 0.0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, this.width, 52);

    // Score
    ctx.font = 'bold 18px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText(`SCORE: ${entities.score.toString().padStart(6, '0')}`, 25, 24);

    // Live Arcade Ranking & Target
    const rankInfo = highScoreManager.getLiveRank(entities.score);
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 6;
    const nextText = rankInfo.rank === 1
      ? `★ RANK #1 [${highScoreManager.getPilotName()}] CHAMPION!`
      : `PILOT: [${highScoreManager.getPilotName()}] | RANK #${rankInfo.rank} (OVERTAKE #${rankInfo.rank - 1} ${rankInfo.nextTargetName}: -${rankInfo.diffToNext.toLocaleString()} PTS)`;
    ctx.fillText(nextText, 25, 42);

    // Combo Multiplier
    if (entities.comboMultiplier > 1.0) {
      ctx.font = 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 10;
      ctx.fillText(`COMBO x${entities.comboMultiplier.toFixed(1)}!`, 230, 24);
    }

    // Stage / Sector Name
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    const sectorName = stageId === 1
      ? 'SECTOR 1: DEEP SPACE'
      : stageId === 2
      ? 'SECTOR 2: CYBER FORTRESS'
      : stageId % 2 === 1
      ? `SECTOR ${stageId}: NEBULA CLUSTER (ENDLESS)`
      : `SECTOR ${stageId}: DREADNOUGHT CORE (ENDLESS)`;
    ctx.fillText(sectorName, this.width / 2, 20);

    // Progress Bar
    const pBarW = 200;
    const pBarH = 6;
    const pBarX = this.width / 2 - pBarW / 2;
    const pBarY = 26;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(pBarX, pBarY, pBarW, pBarH);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(pBarX, pBarY, pBarW * Math.min(1.0, stageProgress), pBarH);

    // Touch overlay indicator
    ctx.textAlign = 'right';
    ctx.font = '12px "Share Tech Mono", monospace';
    ctx.fillStyle = isTouchEnabled ? '#00ff66' : '#667788';
    ctx.fillText(isTouchEnabled ? '[TOUCH ON]' : '[TOUCH OFF]', this.width - 25, 24);

    // Live Arcade Placement Ticker (Top Right)
    const placements = highScoreManager.getPlacementToCurrentScore(entities.score, highScoreManager.getPilotName());
    const maxRows = Math.min(placements.length, 5);
    const panelW = 185;
    const panelH = 20 + maxRows * 15;
    const panelX = this.width - panelW - 20;
    const panelY = 40;

    ctx.fillStyle = 'rgba(4, 9, 22, 0.75)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.font = 'bold 10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE ARCADE RANKS', panelX + 8, panelY + 13);

    placements.slice(0, maxRows).forEach((p, idx) => {
      const rowY = panelY + 27 + idx * 14;
      const isPlayer = p.isCurrentPlayer;
      ctx.font = isPlayer ? 'bold 11px "Share Tech Mono", monospace' : '10px "Share Tech Mono", monospace';
      ctx.fillStyle = isPlayer ? '#ffea00' : '#88ccdd';
      ctx.shadowColor = isPlayer ? '#ffea00' : 'transparent';
      ctx.shadowBlur = isPlayer ? 6 : 0;
      const mark = isPlayer ? '►' : ' ';
      ctx.fillText(`${mark}#${p.rank} ${p.initials}`, panelX + 6, rowY);
      ctx.textAlign = 'right';
      ctx.fillText(`${p.score.toLocaleString()}`, panelX + panelW - 6, rowY);
      ctx.textAlign = 'left';
    });

    // Bottom HUD Bar: Hull Integrity & Secondary Weapons
    const botGrad = ctx.createLinearGradient(0, this.height - 50, 0, this.height);
    botGrad.addColorStop(0, 'rgba(3, 7, 18, 0.0)');
    botGrad.addColorStop(1, 'rgba(3, 7, 18, 0.9)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, this.height - 50, this.width, 50);

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

    ctx.fillStyle = hpRatio > 0.5 ? '#00ff66' : hpRatio > 0.25 ? '#ffea00' : '#ff0033';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fillRect(hpBarX + 2, hpBarY + 2, (hpBarW - 4) * hpRatio, hpBarH - 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillText(`${Math.ceil(entities.player.health)}%`, hpBarX + hpBarW + 10, this.height - 20);

    // Player Gold Balance in HUD
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 8;
    ctx.fillText(`GOLD: ✪ ${shopManager.getGold()}`, this.width / 2, this.height - 20);

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

    // Boss Health Bar
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
    ctx.fillStyle = 'rgba(5, 8, 17, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 42px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    ctx.fillText('MISSION PAUSED', this.width / 2, 160);

    ctx.font = 'bold 18px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fillText('[ PRESS ESC / P TO RESUME ]', this.width / 2, 215);
    ctx.fillText('[ PRESS R TO RESTART MISSION ]', this.width / 2, 252);
    ctx.fillText('[ PRESS M TO TOGGLE AUDIO MUTE ]', this.width / 2, 289);

    // Hangar / Shop button
    const pShopX = this.width / 2 - 180;
    const pShopY = 325;
    const pShopW = 360;
    const pShopH = 36;
    ctx.fillStyle = 'rgba(10, 24, 48, 0.9)';
    ctx.fillRect(pShopX, pShopY, pShopW, pShopH);
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 8;
    ctx.strokeRect(pShopX, pShopY, pShopW, pShopH);

    ctx.font = 'bold 14px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 6;
    ctx.fillText('★ [H] SPACESHIP HANGAR & REQUISITIONS ★', this.width / 2, pShopY + 23);

    ctx.font = '14px "Share Tech Mono", monospace';
    ctx.fillStyle = '#88aacc';
    ctx.shadowBlur = 0;
    ctx.fillText(`PILOT: [${highScoreManager.getPilotName()}]  |  CREDITS: ✪ ${shopManager.getGold()}`, this.width / 2, 395);
  }

  private drawStageWarpScreen(ctx: CanvasRenderingContext2D, stageId: number = 1): void {
    ctx.textAlign = 'center';

    const pulse = Math.sin(this.time * 8) > 0;
    ctx.font = 'bold 44px "Share Tech Mono", monospace';
    ctx.fillStyle = pulse ? '#ffffff' : '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;
    ctx.fillText('HYPERSPACE WARP ENGAGED', this.width / 2, 210);

    ctx.font = 'bold 24px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 15;
    ctx.fillText(`SECTOR ${stageId} CLEARED // +${(20000 * stageId).toLocaleString()} PTS BONUS!`, this.width / 2, 260);

    ctx.font = 'bold 22px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 12;
    const nextSectorName = (stageId + 1) % 2 === 1
      ? `WARPING TO SECTOR ${stageId + 1}: DEEP NEBULA (BIO-SWARM)...`
      : `WARPING TO SECTOR ${stageId + 1}: DREADNOUGHT CORE (DEFENSE GRID)...`;
    ctx.fillText(nextSectorName, this.width / 2, 310);
  }

  /**
   * Game Over screen showing placements from Rank #1 down to the player's current score
   */
  private drawGameOverScreen(ctx: CanvasRenderingContext2D, entities: EntityManager, stageId: number = 1): void {
    ctx.fillStyle = 'rgba(10, 2, 8, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 44px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 24;
    ctx.fillText('MISSION FAILED', this.width / 2, 80);

    ctx.font = '17px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    const rankInfo = highScoreManager.getLiveRank(entities.score);
    ctx.fillText(
      `PILOT: ${highScoreManager.getPilotName()}  |  SECTOR REACHED: ${stageId}  |  FINAL SCORE: ${entities.score.toLocaleString()} PTS  |  RANK: #${rankInfo.rank}`,
      this.width / 2,
      115
    );

    // Full arcade Hall of Fame listing from #1 down to player's current score
    ctx.font = 'bold 16px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText('=== ARCADE LEADERBOARD // PLACEMENT 1 TO YOUR SCORE ===', this.width / 2, 155);

    const placements = highScoreManager.getPlacementToCurrentScore(entities.score, highScoreManager.getPilotName());
    const displayCount = Math.min(placements.length, 8);
    const startY = 188;
    const rowH = 26;

    placements.slice(0, displayCount).forEach((p, idx) => {
      const rowY = startY + idx * rowH;
      const isPlayer = p.isCurrentPlayer;

      if (isPlayer) {
        ctx.fillStyle = 'rgba(255, 234, 0, 0.18)';
        ctx.fillRect(this.width / 2 - 260, rowY - 18, 520, rowH);
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(this.width / 2 - 260, rowY - 18, 520, rowH);
      }

      ctx.font = isPlayer ? 'bold 16px "Share Tech Mono", monospace' : '15px "Share Tech Mono", monospace';
      ctx.fillStyle = isPlayer ? '#ffea00' : p.rank === 1 ? '#00ff66' : '#e0f8ff';
      ctx.shadowColor = isPlayer ? '#ffea00' : p.rank === 1 ? '#00ff66' : '#00f0ff';
      ctx.shadowBlur = isPlayer ? 10 : 4;

      const mark = isPlayer ? '► YOU ◄' : `       `;
      ctx.fillText(
        `#${p.rank.toString().padStart(2, ' ')}  [${p.initials.padEnd(10, ' ')}]  ${p.score.toString().padStart(6, ' ')} PTS  ${mark}`,
        this.width / 2,
        rowY
      );
    });

    const blink = Math.sin(this.time * 5) > 0;
    if (blink) {
      ctx.font = 'bold 22px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 15;
      ctx.fillText('[ PRESS SPACE OR CLICK TO REDEPLOY ]', this.width / 2, 470);
    }

    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#8899aa';
    ctx.shadowBlur = 0;
    ctx.fillText('Remastered with passion by Mark Wilson (@markwlsn)', this.width / 2, 510);
  }

  private drawVictoryScreen(ctx: CanvasRenderingContext2D, entities: EntityManager): void {
    ctx.fillStyle = 'rgba(3, 12, 22, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 25;
    ctx.fillText('SECTOR VICTORY ACHIEVED!', this.width / 2, 120);

    ctx.font = '19px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 6;
    ctx.fillText(`TOTAL SCORE: ${entities.score} PTS  |  ENEMIES DESTROYED: ${entities.enemiesDestroyed}`, this.width / 2, 180);
    ctx.fillText(`PILOT CALLSIGN: [${highScoreManager.getPilotName()}]`, this.width / 2, 215);

    const blink = Math.sin(this.time * 5) > 0;
    if (blink) {
      ctx.font = 'bold 24px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 15;
      ctx.fillText('[ PRESS SPACE OR CLICK TO WARP FORWARD ]', this.width / 2, 400);
    }
  }

  /**
   * Starfleet Requisitions & Spaceship Hangar Interface
   */
  private drawShopModal(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(3, 7, 18, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle CRT background grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }

    const ships = shopManager.getAllShips();
    const currentGold = shopManager.getGold();
    const equipped = shopManager.getEquippedShip();
    const selectedShip = ships[this.selectedShopShipIndex] || ships[0];
    const isUnlocked = shopManager.isShipUnlocked(selectedShip.id);
    const isEquipped = equipped.id === selectedShip.id;

    // --- Header ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillText('★ STARFLEET HANGAR & REQUISITIONS BAY ★', 35, 45);

    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 10;
    ctx.fillText(`FLEET CREDITS: ✪ ${currentGold.toLocaleString()}`, this.width - 35, 45);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(35, 60);
    ctx.lineTo(this.width - 35, 60);
    ctx.stroke();

    // --- Left Column: Ship Catalog List (x = 35, w = 330) ---
    ships.forEach((s, idx) => {
      const cardY = 80 + idx * 78;
      const isSelected = idx === this.selectedShopShipIndex;
      const shipOwned = shopManager.isShipUnlocked(s.id);
      const shipEq = equipped.id === s.id;

      // Card Background & Border
      ctx.fillStyle = isSelected ? 'rgba(10, 30, 60, 0.85)' : 'rgba(5, 14, 28, 0.65)';
      ctx.fillRect(35, cardY, 330, 70);

      ctx.strokeStyle = isSelected ? s.color : shipEq ? '#00ff66' : 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.shadowColor = isSelected ? s.color : 'transparent';
      ctx.shadowBlur = isSelected ? 8 : 0;
      ctx.strokeRect(35, cardY, 330, 70);

      // Ship Name
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Share Tech Mono", monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : '#d0e8ff';
      ctx.fillText(s.name, 48, cardY + 25);

      // Franchise
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillStyle = s.color;
      ctx.fillText(s.franchise, 48, cardY + 44);

      // Price / Owned Badge
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px "Share Tech Mono", monospace';
      if (shipEq) {
        ctx.fillStyle = '#00ff66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 6;
        ctx.fillText('[ EQUIPPED ]', 350, cardY + 38);
      } else if (shipOwned) {
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 4;
        ctx.fillText('[ OWNED ]', 350, cardY + 38);
      } else {
        ctx.fillStyle = currentGold >= s.price ? '#ffea00' : '#ff4444';
        ctx.shadowColor = currentGold >= s.price ? '#ffea00' : '#ff4444';
        ctx.shadowBlur = 6;
        ctx.fillText(`✪ ${s.price.toLocaleString()}`, 350, cardY + 38);
      }
    });

    // Return button at bottom left
    const retX = 35;
    const retY = 485;
    ctx.fillStyle = 'rgba(10, 25, 45, 0.85)';
    ctx.fillRect(retX, retY, 180, 36);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(retX, retY, 180, 36);
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('◄ RETURN [ESC]', retX + 90, retY + 23);

    // --- Right Column: Vessel Docking Bay & Hologram Telemetry (x = 385, w = 540) ---
    const panelX = 385;
    const panelY = 80;
    const panelW = 540;
    const panelH = 440;

    ctx.fillStyle = 'rgba(4, 10, 24, 0.8)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = selectedShip.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = selectedShip.color;
    ctx.shadowBlur = 10;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Docking Bay Holographic Cradle (cx = 655, cy = 165)
    const dockCx = panelX + panelW / 2;
    const dockCy = 170;

    // Platform rings
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(dockCx, dockCy + 35, 110, 25, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = selectedShip.color;
    ctx.beginPath();
    ctx.ellipse(dockCx, dockCy + 35, 75, 16, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Holographic Vertical Scan Beam
    const holoGrad = ctx.createLinearGradient(0, dockCy - 70, 0, dockCy + 35);
    holoGrad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
    holoGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.08)');
    holoGrad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');
    ctx.fillStyle = holoGrad;
    ctx.beginPath();
    ctx.moveTo(dockCx - 80, dockCy + 35);
    ctx.lineTo(dockCx - 50, dockCy - 60);
    ctx.lineTo(dockCx + 50, dockCy - 60);
    ctx.lineTo(dockCx + 80, dockCy + 35);
    ctx.closePath();
    ctx.fill();

    // 3D Rotating Starfighter Projection
    this.drawWireframeShip(ctx, dockCx, dockCy, 2.5, this.time * 1.8, 0.22);

    // Selected Vessel Specs & Lore
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = selectedShip.color;
    ctx.shadowBlur = 10;
    ctx.fillText(selectedShip.name, panelX + 25, 235);

    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = selectedShip.color;
    ctx.fillText(`// CLASSIFICATION: ${selectedShip.franchise} //`, panelX + 25, 255);

    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#99ccee';
    ctx.shadowBlur = 0;
    ctx.fillText(selectedShip.description, panelX + 25, 278);

    // Spec Bars
    const barX = panelX + 160;
    const barW = 200;
    const barH = 10;

    // 1. Velocity / Speed
    const spdRatio = Math.min(1.0, selectedShip.speed / 450);
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#88ccff';
    ctx.fillText('CRUISE SPEED:', panelX + 25, 310);
    ctx.strokeStyle = '#00f0ff';
    ctx.strokeRect(barX, 301, barW, barH);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(barX + 2, 303, (barW - 4) * spdRatio, barH - 4);
    ctx.fillText(`${selectedShip.speed} PX/S`, barX + barW + 12, 310);

    // 2. Hull Durability
    const hpRatio = Math.min(1.0, selectedShip.maxHealth / 200);
    ctx.fillStyle = '#88ccff';
    ctx.fillText('HULL ARMOR:', panelX + 25, 332);
    ctx.strokeStyle = '#00ff66';
    ctx.strokeRect(barX, 323, barW, barH);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(barX + 2, 325, (barW - 4) * hpRatio, barH - 4);
    ctx.fillText(`${selectedShip.maxHealth} HP`, barX + barW + 12, 332);

    // 3. Fire Rate
    const fireRoundsSec = (1 / selectedShip.fireRate).toFixed(1);
    const frRatio = Math.min(1.0, (1 / selectedShip.fireRate) / 14);
    ctx.fillStyle = '#88ccff';
    ctx.fillText('FIRE RATE:', panelX + 25, 354);
    ctx.strokeStyle = '#ffea00';
    ctx.strokeRect(barX, 345, barW, barH);
    ctx.fillStyle = '#ffea00';
    ctx.fillRect(barX + 2, 347, (barW - 4) * frRatio, barH - 4);
    ctx.fillText(`${fireRoundsSec} SHOTS/S`, barX + barW + 12, 354);

    // Weapon & Trait
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText(`PRIMARY WEAPON: ${selectedShip.primaryWeaponName}`, panelX + 25, 386);

    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(`SPECIAL TRAIT: ${selectedShip.specialTrait}`, panelX + 25, 410);

    // --- Action Button: Requisition / Equip ---
    const actBtnX = 440;
    const actBtnY = 440;
    const actBtnW = 430;
    const actBtnH = 46;

    if (isEquipped) {
      ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
      ctx.fillRect(actBtnX, actBtnY, actBtnW, actBtnH);
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 2;
      ctx.strokeRect(actBtnX, actBtnY, actBtnW, actBtnH);

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 8;
      ctx.fillText('✓ CURRENTLY EQUIPPED IN COMBAT', actBtnX + actBtnW / 2, actBtnY + 29);
    } else if (isUnlocked) {
      const pulse = Math.sin(this.time * 6) > 0;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillRect(actBtnX, actBtnY, actBtnW, actBtnH);
      ctx.strokeStyle = pulse ? '#ffffff' : '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.strokeRect(actBtnX, actBtnY, actBtnW, actBtnH);

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('[ CLICK TO EQUIP THIS VESSEL ]', actBtnX + actBtnW / 2, actBtnY + 29);
    } else {
      const canAfford = currentGold >= selectedShip.price;
      ctx.fillStyle = canAfford ? 'rgba(255, 234, 0, 0.18)' : 'rgba(255, 51, 68, 0.18)';
      ctx.fillRect(actBtnX, actBtnY, actBtnW, actBtnH);
      ctx.strokeStyle = canAfford ? '#ffea00' : '#ff3344';
      ctx.lineWidth = 2;
      ctx.shadowColor = canAfford ? '#ffea00' : '#ff3344';
      ctx.shadowBlur = 10;
      ctx.strokeRect(actBtnX, actBtnY, actBtnW, actBtnH);

      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Share Tech Mono", monospace';
      ctx.fillStyle = canAfford ? '#ffea00' : '#ff4444';
      const buyText = canAfford
        ? `[ REQUISITION VESSEL FOR ✪ ${selectedShip.price.toLocaleString()} GOLD ]`
        : `[ INSUFFICIENT CREDITS (NEED ✪ ${selectedShip.price.toLocaleString()} GOLD) ]`;
      ctx.fillText(buyText, actBtnX + actBtnW / 2, actBtnY + 29);
    }
  }
}

