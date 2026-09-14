import { BossEntity, Vector2D, BoundingBox } from '../types';
import { Projectile } from './Projectile';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { CameraShake } from '../graphics/CameraShake';
import { soundSynthesizer } from '../audio/SoundSynthesizer';

export interface ShieldDrone {
  id: string;
  angle: number;
  radius: number;
  health: number;
  maxHealth: number;
  isDead: boolean;
  box: BoundingBox;
}

export class BossSentinel implements BossEntity {
  public id: string = 'boss_sentinel';
  public bossName: string = 'THE CORE SENTINEL';
  public position: Vector2D;
  public velocity: Vector2D = { x: 0, y: 0 };
  public box: BoundingBox;
  public isDead: boolean = false;
  public isDefeated: boolean = false;

  public health: number = 2200;
  public maxHealth: number = 2200;

  private time: number = 0;
  private attackTimer: number = 0;
  private ringAttackTimer: number = 0;
  private laserSweepTimer: number = 0;

  // Orbiting Shield Drones (T11)
  public drones: ShieldDrone[] = [];
  private droneRotationSpeed: number = 1.0; // radians/sec

  // Laser Sweep Arms
  public laserAngle: number = 0;
  public isSweepingLasers: boolean = false;
  private sweepDuration: number = 0;

  constructor(x: number = 780, y: number = 270) {
    this.position = { x, y };
    this.box = { x: x - 65, y: y - 65, width: 130, height: 130 };
    this.initShieldDrones(5);
  }

  private initShieldDrones(count: number): void {
    this.drones = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.drones.push({
        id: `drone_${i}`,
        angle,
        radius: 115,
        health: 140,
        maxHealth: 140,
        isDead: false,
        box: { x: 0, y: 0, width: 28, height: 28 },
      });
    }
  }

  public getPhase(): number {
    const ratio = this.health / this.maxHealth;
    if (ratio > 0.6) return 1;
    if (ratio > 0.28) return 2;
    return 3; // Enraged meltdown
  }

  public takeDamage(amount: number): void {
    if (this.isDefeated) return;

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDefeated = true;
      this.isDead = true;
    }
  }

  public damageDrone(droneIndex: number, amount: number, particleSystem?: ParticleSystem): boolean {
    const drone = this.drones[droneIndex];
    if (!drone || drone.isDead) return false;

    drone.health -= amount;
    if (drone.health <= 0) {
      drone.isDead = true;
      const droneX = this.position.x + Math.cos(drone.angle) * drone.radius;
      const droneY = this.position.y + Math.sin(drone.angle) * drone.radius;
      soundSynthesizer.playExplosion(1.5);
      particleSystem?.emitExplosion(droneX, droneY, 1.6, '#00f0ff');
      particleSystem?.emitFloatingText(droneX, droneY - 20, 'SHIELD BROKEN!', '#00ffff');
      return true;
    }
    return false;
  }

  public update(
    dt: number,
    playerPos?: Vector2D,
    projectiles?: Projectile[],
    _particleSystem?: ParticleSystem,
    cameraShake?: CameraShake
  ): void {
    if (this.isDefeated) return;

    this.time += dt;
    const phase = this.getPhase();

    // Hover figure-8 pattern
    this.position.y = 270 + Math.sin(this.time * 1.5) * 90;
    this.position.x = 760 + Math.cos(this.time * 0.9) * 35;
    this.box.x = this.position.x - 65;
    this.box.y = this.position.y - 65;

    // Update Shield Drones rotation
    this.droneRotationSpeed = phase === 3 ? 2.6 : phase === 2 ? 1.8 : 1.1;
    this.drones.forEach((drone) => {
      if (!drone.isDead) {
        drone.angle += this.droneRotationSpeed * dt;
        const dx = this.position.x + Math.cos(drone.angle) * drone.radius;
        const dy = this.position.y + Math.sin(drone.angle) * drone.radius;
        drone.box.x = dx - 14;
        drone.box.y = dy - 14;
      }
    });

    // Attacks
    this.ringAttackTimer += dt;
    this.laserSweepTimer += dt;
    this.attackTimer += dt;

    // 1. Homing Bullet Rings (T11)
    const ringInterval = phase === 3 ? 2.5 : 3.8;
    if (this.ringAttackTimer >= ringInterval && projectiles) {
      this.ringAttackTimer = 0;
      this.fireHomingBulletRing(projectiles, playerPos);
      soundSynthesizer.playBossAlarm();
    }

    // 2. Rotating Dual Laser Sweeping Arms (Phase 2 & 3)
    if (phase >= 2) {
      if (!this.isSweepingLasers && this.laserSweepTimer >= 5.5) {
        this.isSweepingLasers = true;
        this.laserSweepTimer = 0;
        this.sweepDuration = 0;
        soundSynthesizer.playBeamLaser();
        cameraShake?.addTrauma(0.4);
      }

      if (this.isSweepingLasers) {
        this.sweepDuration += dt;
        this.laserAngle += dt * 0.95;
        if (this.sweepDuration >= 2.5) {
          this.isSweepingLasers = false;
        }
      }
    }

    // 3. Spiral Core Barrage (Phase 3 Enraged)
    if (phase === 3 && projectiles) {
      if (this.attackTimer >= 0.25) {
        this.attackTimer = 0;
        const count = 3;
        for (let i = 0; i < count; i++) {
          const a = this.time * 4.0 + (i * Math.PI * 2) / count;
          projectiles.push(
            new Projectile(
              Math.random().toString(),
              this.position.x,
              this.position.y,
              Math.cos(a) * 260,
              Math.sin(a) * 260,
              'ENEMY',
              'ENEMY_BULLET',
              12
            )
          );
        }
      }
    }
  }

  private fireHomingBulletRing(projectiles: Projectile[], playerPos?: Vector2D): void {
    const bulletCount = 14;
    const ringSpeed = 200;

    let targetAngle = 0;
    if (playerPos) {
      targetAngle = Math.atan2(playerPos.y - this.position.y, playerPos.x - this.position.x);
    }

    for (let i = 0; i < bulletCount; i++) {
      const angle = (i / bulletCount) * Math.PI * 2 + targetAngle;
      const bullet = new Projectile(
        Math.random().toString(),
        this.position.x,
        this.position.y,
        Math.cos(angle) * ringSpeed,
        Math.sin(angle) * ringSpeed,
        'ENEMY',
        'ENEMY_BULLET',
        14
      );
      projectiles.push(bullet);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    ctx.save();

    const phase = this.getPhase();
    const coreGlow = phase === 3 ? '#ff0033' : phase === 2 ? '#ff7700' : '#00f0ff';

    // 1. Draw Orbiting Shield Drones (T11)
    this.drones.forEach((drone) => {
      if (drone.isDead) return;

      const dx = this.position.x + Math.cos(drone.angle) * drone.radius;
      const dy = this.position.y + Math.sin(drone.angle) * drone.radius;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(drone.angle + Math.PI / 2);

      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#00f0ff';
      ctx.fillStyle = '#061626';
      ctx.lineWidth = 2;

      // Hexagonal drone
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2;
        const px = Math.cos(a) * 14;
        const py = Math.sin(a) * 14;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Energy shield arc
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });

    // 2. Draw Sweeping Laser Arms
    if (this.isSweepingLasers) {
      ctx.save();
      const armLength = 700;
      for (let arm = 0; arm < 2; arm++) {
        const a = this.laserAngle + arm * Math.PI;
        const endX = this.position.x + Math.cos(a) * armLength;
        const endY = this.position.y + Math.sin(a) * armLength;

        ctx.strokeStyle = 'rgba(255, 0, 70, 0.75)';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Central Hexagonal Fortress Core
    ctx.translate(this.position.x, this.position.y);

    // Outer rotating casing
    ctx.save();
    ctx.rotate(this.time * 0.7);
    ctx.shadowColor = coreGlow;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = coreGlow;
    ctx.lineWidth = 3.5;
    ctx.fillStyle = '#150616';

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 60;
      const y = Math.sin(a) * 60;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Inner counter-rotating ring
    ctx.save();
    ctx.rotate(-this.time * 1.2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(38, 0);
    ctx.moveTo(0, -38);
    ctx.lineTo(0, 38);
    ctx.stroke();
    ctx.restore();

    // Pulsing central plasma nucleus
    const pulse = 20 + Math.sin(this.time * 8) * 5;
    ctx.fillStyle = coreGlow;
    ctx.shadowColor = coreGlow;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, pulse * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  public checkLaserSweepCollision(playerBox: BoundingBox): boolean {
    if (!this.isSweepingLasers) return false;

    // Check distance of player center to the 2 sweeping laser lines
    const px = playerBox.x + playerBox.width / 2;
    const py = playerBox.y + playerBox.height / 2;
    const armLength = 700;

    for (let arm = 0; arm < 2; arm++) {
      const a = this.laserAngle + arm * Math.PI;
      const endX = this.position.x + Math.cos(a) * armLength;
      const endY = this.position.y + Math.sin(a) * armLength;

      // Distance from point to line segment
      const lineLen2 = (endX - this.position.x) ** 2 + (endY - this.position.y) ** 2;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((px - this.position.x) * (endX - this.position.x) +
            (py - this.position.y) * (endY - this.position.y)) /
            lineLen2
        )
      );
      const projX = this.position.x + t * (endX - this.position.x);
      const projY = this.position.y + t * (endY - this.position.y);
      const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);

      if (dist < 14) {
        return true;
      }
    }
    return false;
  }
}
