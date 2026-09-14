import { BossEntity, Vector2D, BoundingBox } from '../types';
import { Projectile } from './Projectile';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { CameraShake } from '../graphics/CameraShake';
import { soundSynthesizer } from '../audio/SoundSynthesizer';

export class BossMollusk implements BossEntity {
  public id: string = 'boss_mollusk';
  public bossName: string = 'CYBERNETIC MOLLUSK';
  public position: Vector2D;
  public velocity: Vector2D = { x: 0, y: 0 };
  public box: BoundingBox;
  public isDead: boolean = false;
  public isDefeated: boolean = false;

  public health: number = 1200;
  public maxHealth: number = 1200;

  private time: number = 0;
  private attackTimer: number = 0;
  private tentacleAngle: number = 0;

  // Charged Beam State (Phase 2 Climax)
  private isChargingBeam: boolean = false;
  private isFiringBeam: boolean = false;
  private beamTimer: number = 0;
  private beamY: number = 270;

  constructor(x: number = 780, y: number = 270) {
    this.position = { x, y };
    this.box = { x: x - 60, y: y - 80, width: 120, height: 160 };
  }

  public getPhase(): number {
    return this.health > this.maxHealth * 0.5 ? 1 : 2;
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
    this.tentacleAngle = Math.sin(this.time * 2.5);

    // Smooth hover movement
    this.position.y = 270 + Math.sin(this.time * 1.8) * 110;
    this.box.x = this.position.x - 60;
    this.box.y = this.position.y - 80;

    this.attackTimer += dt;
    const phase = this.getPhase();

    // Beam management
    if (this.isChargingBeam) {
      this.beamTimer += dt;
      if (this.beamTimer >= 1.2) {
        // Fire charged beam!
        this.isChargingBeam = false;
        this.isFiringBeam = true;
        this.beamTimer = 0;
        soundSynthesizer.playBeamLaser();
        cameraShake?.addTrauma(0.6);
      }
    } else if (this.isFiringBeam) {
      this.beamTimer += dt;
      if (this.beamTimer >= 1.0) {
        this.isFiringBeam = false;
        this.beamTimer = 0;
      }
    }

    // Attacks execution
    if (phase === 1) {
      // Phase 1: Tentacle spreads every 2.2 seconds
      if (this.attackTimer >= 2.2 && projectiles) {
        this.attackTimer = 0;
        this.fireTentacleSpread(projectiles);
      }
    } else {
      // Phase 2: Alternating beam charge and heavy spiral fan
      if (this.attackTimer >= 3.4 && !this.isChargingBeam && !this.isFiringBeam) {
        this.attackTimer = 0;
        if (Math.random() > 0.45 && playerPos) {
          // Initiate charged beam telegraphed at player Y
          this.isChargingBeam = true;
          this.beamTimer = 0;
          this.beamY = playerPos.y;
          soundSynthesizer.playBossAlarm();
        } else if (projectiles) {
          this.fireSpiralBarrage(projectiles);
        }
      }
    }

    // Emit damage sparks if in phase 2
    if (phase === 2 && particleSystem && Math.random() > 0.6) {
      particleSystem.emitSparks(
        this.position.x - 40 + Math.random() * 80,
        this.position.y - 60 + Math.random() * 120,
        2,
        '#ff0055'
      );
    }
  }

  private fireTentacleSpread(projectiles: Projectile[]): void {
    const angles = [-0.4, -0.2, 0, 0.2, 0.4];
    const speed = 280;
    for (const angle of angles) {
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          this.position.x - 50,
          this.position.y + Math.sin(angle) * 30,
          -Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          'ENEMY',
          'ENEMY_BULLET',
          14
        )
      );
    }
  }

  private fireSpiralBarrage(projectiles: Projectile[]): void {
    const count = 9;
    const speed = 260;
    for (let i = 0; i < count; i++) {
      const angle = -0.7 + (i / (count - 1)) * 1.4;
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          this.position.x - 50,
          this.position.y,
          -Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          'ENEMY',
          'ENEMY_BULLET',
          15
        )
      );
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    const phase = this.getPhase();
    const glowColor = phase === 1 ? '#ff0077' : '#ff2200';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#150616';

    // 1. Articulated Tentacles (4 undulating biomechanical arms)
    for (let t = 0; t < 4; t++) {
      const dirY = (t - 1.5) * 36;
      ctx.beginPath();
      ctx.moveTo(-20, dirY * 0.4);

      const cp1x = -60 - Math.abs(dirY);
      const cp1y = dirY + this.tentacleAngle * 25;
      const cp2x = -110;
      const cp2y = dirY * 1.2 - this.tentacleAngle * 20;
      const endX = -135;
      const endY = dirY * 1.4 + this.tentacleAngle * 15;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.stroke();

      // Tentacle tip glowing claw
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(endX, endY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Main Nautilus Shell Body
    ctx.fillStyle = '#150616';
    ctx.beginPath();
    ctx.ellipse(10, 0, 65, 85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Segmented shell ridges
    ctx.beginPath();
    for (let r = -60; r <= 60; r += 30) {
      ctx.moveTo(35, r);
      ctx.quadraticCurveTo(0, r * 1.2, -35, r * 0.7);
    }
    ctx.stroke();

    // 3. Central Glowing Cybernetic Core / Eye
    const eyePulse = 18 + Math.sin(this.time * 6) * 4;
    ctx.shadowColor = phase === 1 ? '#00ffff' : '#ffea00';
    ctx.fillStyle = phase === 1 ? '#00f0ff' : '#ffff00';
    ctx.beginPath();
    ctx.arc(-20, 0, eyePulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner pupil
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-20, 0, eyePulse * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Charged Laser Beam & Telegraph Line Rendering
    if (this.isChargingBeam) {
      // Telegraph warning line across screen
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 50, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(0, this.beamY);
      ctx.lineTo(this.position.x, this.beamY);
      ctx.stroke();
      ctx.restore();
    } else if (this.isFiringBeam) {
      // Devastating hyper-laser beam
      ctx.save();
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 25;
      ctx.fillStyle = 'rgba(255, 0, 80, 0.6)';
      ctx.fillRect(0, this.beamY - 24, this.position.x, 48);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, this.beamY - 7, this.position.x, 14);
      ctx.restore();
    }
  }

  // Collision with charged beam
  public checkBeamCollision(playerBox: BoundingBox): boolean {
    if (!this.isFiringBeam) return false;
    return playerBox.y + playerBox.height >= this.beamY - 24 && playerBox.y <= this.beamY + 24;
  }
}
