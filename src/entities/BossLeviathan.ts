import { BossEntity, Vector2D, BoundingBox } from '../types';
import { Projectile } from './Projectile';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { CameraShake } from '../graphics/CameraShake';
import { soundSynthesizer } from '../audio/SoundSynthesizer';

export interface LeviathanSegment {
  x: number;
  y: number;
  radius: number;
  angle: number;
}

export class BossLeviathan implements BossEntity {
  public id: string = 'boss_leviathan';
  public bossName: string = 'ASTRO-WYRM LEVIATHAN';
  public position: Vector2D;
  public velocity: Vector2D = { x: 0, y: 0 };
  public box: BoundingBox;
  public isDead: boolean = false;
  public isDefeated: boolean = false;

  public health: number = 3200;
  public maxHealth: number = 3200;

  private time: number = 0;
  private attackTimer: number = 0;
  private breathTimer: number = 0;
  private isBreathingPlasma: boolean = false;
  private breathShotsFired: number = 0;

  public segments: LeviathanSegment[] = [];
  private numSegments: number = 8;
  private segmentSpacing: number = 38;

  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private baseX: number = 760;

  constructor(x: number = 760, y: number = 270) {
    this.position = { x, y };
    this.baseX = x;
    this.box = { x: x - 65, y: y - 55, width: 130, height: 110 };

    for (let i = 0; i < this.numSegments; i++) {
      this.segments.push({
        x: x + (i + 1) * this.segmentSpacing,
        y: y,
        radius: Math.max(14, 32 - i * 2.2),
        angle: 0,
      });
    }
  }

  public getPhase(): number {
    const ratio = this.health / this.maxHealth;
    if (ratio > 0.5) return 1;
    return 2;
  }

  public takeDamage(amount: number): void {
    if (this.isDefeated) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDefeated = true;
      this.isDead = true;
    }
  }

  public update(
    dt: number,
    playerPos?: Vector2D,
    projectiles?: Projectile[],
    particleSystem?: ParticleSystem,
    cameraShake?: CameraShake
  ): void {
    if (this.isDefeated) return;
    this.time += dt;
    const phase = this.getPhase();
    const speedMult = phase === 2 ? 1.4 : 1.0;

    if (this.isDashing) {
      this.dashTimer += dt;
      this.position.x -= 550 * dt;
      if (this.position.x < 180 || this.dashTimer > 1.6) {
        this.isDashing = false;
        this.dashTimer = 0;
      }
    } else {
      this.position.x += (this.baseX - this.position.x) * 2.0 * dt;
      this.position.y = 270 + Math.sin(this.time * 2.0 * speedMult) * 160;
    }
    this.box.x = this.position.x - 65;
    this.box.y = this.position.y - 55;

    let prevX = this.position.x;
    let prevY = this.position.y;
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      const dx = seg.x - prevX;
      const dy = seg.y - prevY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      seg.x = prevX + (dx / dist) * this.segmentSpacing;
      seg.y = prevY + (dy / dist) * this.segmentSpacing + Math.sin(this.time * 3.5 + i * 0.6) * 4.5;
      seg.angle = Math.atan2(prevY - seg.y, prevX - seg.x);
      prevX = seg.x;
      prevY = seg.y;
    }

    this.attackTimer += dt;
    if (this.isBreathingPlasma) {
      this.breathTimer += dt;
      if (this.breathTimer >= 0.08 && projectiles && this.breathShotsFired < 14) {
        this.breathTimer = 0;
        this.breathShotsFired++;
        const spreadY = Math.sin(this.breathShotsFired * 0.75) * 80;
        projectiles.push(
          new Projectile(
            Math.random().toString(),
            this.position.x - 45,
            this.position.y + spreadY * 0.25,
            -480,
            spreadY * 1.5,
            'ENEMY',
            'DRAGON_BREATH',
            1
          )
        );
        soundSynthesizer.playLaser();
        cameraShake?.addTrauma(0.08);
      }
      if (this.breathShotsFired >= 14) {
        this.isBreathingPlasma = false;
        this.breathShotsFired = 0;
      }
    }

    const cycleTime = phase === 2 ? 3.0 : 3.8;
    if (this.attackTimer >= cycleTime && !this.isBreathingPlasma && !this.isDashing) {
      this.attackTimer = 0;
      const rand = Math.random();
      if (rand < 0.4) {
        this.isBreathingPlasma = true;
        this.breathTimer = 0;
        this.breathShotsFired = 0;
        particleSystem?.emitFloatingText(this.position.x, this.position.y - 60, 'LEVIATHAN PLASMA ROAR!', '#ffaa00');
      } else if (rand < 0.75 && projectiles) {
        this.fireTailVolley(projectiles);
      } else if (phase === 2) {
        this.isDashing = true;
        this.dashTimer = 0;
        soundSynthesizer.playBossAlarm();
        cameraShake?.addTrauma(0.4);
        particleSystem?.emitFloatingText(this.position.x, this.position.y - 60, 'WARNING: SERPENTINE DASH!', '#ff0033');
      } else if (projectiles && playerPos) {
        this.spawnHomingMines(projectiles, playerPos);
      }
    }
  }

  private fireTailVolley(projectiles: Projectile[]): void {
    const tailSeg = this.segments[this.segments.length - 1];
    const bulletCount = 8;
    for (let i = 0; i < bulletCount; i++) {
      const angle = Math.PI - 0.9 + (i / (bulletCount - 1)) * 1.8;
      const speed = 360;
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          tailSeg.x,
          tailSeg.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          'ENEMY',
          'ENEMY_BULLET',
          1
        )
      );
    }
    soundSynthesizer.playLaser();
  }

  private spawnHomingMines(projectiles: Projectile[], playerPos: Vector2D): void {
    for (let i = 0; i < 3; i++) {
      const startY = this.position.y - 70 + i * 70;
      const mine = new Projectile(
        Math.random().toString(),
        this.position.x - 30,
        startY,
        -180,
        (Math.random() - 0.5) * 60,
        'ENEMY',
        'HOMING_MINE',
        1
      );
      mine.targetPos = { x: playerPos.x, y: playerPos.y };
      projectiles.push(mine);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDefeated) return;
    ctx.save();
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      ctx.save();
      ctx.translate(seg.x, seg.y);
      ctx.rotate(seg.angle);
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 10;
      ctx.fillStyle = i % 2 === 0 ? '#2a1a08' : '#3d250c';
      ctx.strokeStyle = '#ff9900';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, seg.radius * 1.2, seg.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.moveTo(-seg.radius * 0.4, -seg.radius * 0.9);
      ctx.lineTo(0, -seg.radius * 1.8);
      ctx.lineTo(seg.radius * 0.4, -seg.radius * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, seg.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#1f1307';
    ctx.strokeStyle = '#ff7700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, -35);
    ctx.lineTo(-45, -30);
    ctx.lineTo(-65, -10);
    ctx.lineTo(-50, 0);
    ctx.lineTo(-65, 15);
    ctx.lineTo(-45, 35);
    ctx.lineTo(50, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(10, -32);
    ctx.lineTo(45, -60);
    ctx.lineTo(25, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff0033';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(-30, -12, 10, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-32, -14, 3, 5);
    if (this.isBreathingPlasma) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(-52, 2, 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }
}
