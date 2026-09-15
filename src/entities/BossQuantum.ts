import { BossEntity, Vector2D, BoundingBox } from '../types';
import { Projectile } from './Projectile';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { CameraShake } from '../graphics/CameraShake';
import { soundSynthesizer } from '../audio/SoundSynthesizer';

export class BossQuantum implements BossEntity {
  public id: string = 'boss_quantum';
  public bossName: string = 'QUANTUM MATRIX COLOSSUS';
  public position: Vector2D;
  public velocity: Vector2D = { x: 0, y: 0 };
  public box: BoundingBox;
  public isDead: boolean = false;
  public isDefeated: boolean = false;

  public health: number = 4200;
  public maxHealth: number = 4200;

  private time: number = 0;
  private attackTimer: number = 0;
  private prismAngle: number = 0;

  // Geometric Rhythm Pulse
  private pulseCountdown: number = 2.0;

  constructor(x: number = 780, y: number = 270) {
    this.position = { x, y };
    this.box = { x: x - 65, y: y - 65, width: 130, height: 130 };
  }

  public getPhase(): number {
    const ratio = this.health / this.maxHealth;
    if (ratio > 0.6) return 1;
    if (ratio > 0.3) return 2;
    return 3; // Geometry Dash Overdrive
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
    _playerPos?: Vector2D,
    projectiles?: Projectile[],
    particleSystem?: ParticleSystem,
    cameraShake?: CameraShake
  ): void {
    if (this.isDefeated) return;

    this.time += dt;
    this.prismAngle += dt * 2.2;

    const phase = this.getPhase();
    const speed = phase === 3 ? 2.6 : phase === 2 ? 2.0 : 1.5;

    // Fluid Lissajous figure-8 floating path
    this.position.y = 270 + Math.sin(this.time * speed) * 140;
    this.position.x = 760 + Math.cos(this.time * speed * 0.5) * 50;

    this.box.x = this.position.x - 65;
    this.box.y = this.position.y - 65;

    // Rhythm Geometric Pulses
    this.pulseCountdown -= dt;
    if (this.pulseCountdown <= 0 && projectiles) {
      const pulseInterval = phase === 3 ? 1.4 : phase === 2 ? 1.8 : 2.4;
      this.pulseCountdown = pulseInterval;
      this.fireGeometricPulse(projectiles);
      soundSynthesizer.playLaser();
    }

    // Heavy Attack Cycle
    this.attackTimer += dt;
    const heavyCycle = phase === 3 ? 3.0 : 4.0;
    if (this.attackTimer >= heavyCycle && projectiles) {
      this.attackTimer = 0;
      const rand = Math.random();

      if (rand < 0.45) {
        // Attack A: Hazard Grid (Geometry Dash-style horizontal laser lines with safe gaps)
        this.fireHazardGrid(projectiles);
        cameraShake?.addTrauma(0.35);
        particleSystem?.emitFloatingText(this.position.x, this.position.y - 70, 'GEOMETRIC HAZARD GRID!', '#00f0ff');
      } else if (rand < 0.8) {
        // Attack B: Refraction Matrix (Radial starburst)
        this.firePrismStarburst(projectiles);
        cameraShake?.addTrauma(0.2);
      } else {
        // Attack C: Quantum Warp Phase
        this.executeQuantumWarp(particleSystem, projectiles);
      }
    }
  }

  private fireGeometricPulse(projectiles: Projectile[]): void {
    // Diamond 4-point or 8-point expanding wave
    const count = this.getPhase() >= 2 ? 8 : 4;
    const baseSpeed = 340;
    for (let i = 0; i < count; i++) {
      const angle = this.prismAngle + (i / count) * Math.PI * 2;
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          this.position.x,
          this.position.y,
          Math.cos(angle) * baseSpeed,
          Math.sin(angle) * baseSpeed,
          'ENEMY',
          'QUANTUM_PULSE',
          1
        )
      );
    }
  }

  private fireHazardGrid(projectiles: Projectile[]): void {
    // 3 parallel geometric hazard beams leaving safe navigation corridors (Geometry Dash challenge)
    const ySlots = [120, 270, 420];
    const safeSlot = Math.floor(Math.random() * 3);

    for (let i = 0; i < ySlots.length; i++) {
      if (i === safeSlot) continue; // Safe passage!
      const targetY = ySlots[i];
      for (let b = 0; b < 3; b++) {
        projectiles.push(
          new Projectile(
            Math.random().toString(),
            this.position.x - b * 50,
            targetY,
            -560,
            0,
            'ENEMY',
            'GEOMETRIC_HAZARD',
            1
          )
        );
      }
    }
  }

  private firePrismStarburst(projectiles: Projectile[]): void {
    const count = 12;
    const speed = 400;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          this.position.x,
          this.position.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          'ENEMY',
          'ENEMY_BULLET',
          1
        )
      );
    }
    soundSynthesizer.playBeamLaser();
  }

  private executeQuantumWarp(particleSystem?: ParticleSystem, projectiles?: Projectile[]): void {
    particleSystem?.emitExplosion(this.position.x, this.position.y, 2.0, '#00f0ff');
    soundSynthesizer.playPowerup();

    // Teleport to unexpected vertical position
    this.position.y = 140 + Math.random() * 260;
    particleSystem?.emitExplosion(this.position.x, this.position.y, 2.0, '#ff00ff');
    particleSystem?.emitFloatingText(this.position.x, this.position.y - 70, 'QUANTUM PHASE SHIFT!', '#ff00ff');

    if (projectiles) {
      this.fireGeometricPulse(projectiles);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDefeated) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // 1. Rotating Quantum Hypercube Wireframe (Outer)
    ctx.save();
    ctx.rotate(this.prismAngle);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 16;
    const s1 = 60;
    ctx.strokeRect(-s1 / 2, -s1 / 2, s1, s1);
    ctx.restore();

    // 2. Counter-Rotating Inner Diamond
    ctx.save();
    ctx.rotate(-this.prismAngle * 1.5);
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 14;
    const s2 = 45;
    ctx.beginPath();
    ctx.moveTo(0, -s2);
    ctx.lineTo(s2, 0);
    ctx.lineTo(0, s2);
    ctx.lineTo(-s2, 0);
    ctx.closePath();
    ctx.stroke();

    // Glowing core crystal
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Orbiting Quantum Prisms (4 satellite satellites)
    for (let i = 0; i < 4; i++) {
      const satAngle = this.prismAngle * 1.2 + (i * Math.PI) / 2;
      const dist = 75;
      const sx = Math.cos(satAngle) * dist;
      const sy = Math.sin(satAngle) * dist;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(this.prismAngle * 2 + i);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(-8, -8, 16, 16);

      // Connecting energy beam to core
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-sx, -sy);
      ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}
