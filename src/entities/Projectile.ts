import { Entity, Vector2D, BoundingBox, ProjectileOwner, ProjectileKind } from '../types';
import { ParticleSystem } from '../graphics/ParticleSystem';

export class Projectile implements Entity {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public box: BoundingBox;
  public isDead: boolean = false;
  public owner: ProjectileOwner;
  public kind: ProjectileKind;
  public damage: number;

  // Specific projectile state
  public radius: number = 4;
  public lifeTime: number = 0;
  public maxLifeTime: number = 6.0;

  // Megabomb specific
  public bombRadius: number = 10;
  public maxBombRadius: number = 450;

  // Beam Laser specific
  public beamWidth: number = 960;
  public beamHeight: number = 18;

  // Homing missile specific
  public targetPos: Vector2D | null = null;
  public angle: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    vx: number,
    vy: number,
    owner: ProjectileOwner,
    kind: ProjectileKind,
    damage: number = 10
  ) {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
    this.owner = owner;
    this.kind = kind;
    this.damage = damage;

    if (kind === 'PLASMA') {
      this.box = { x, y: y - 3, width: 18, height: 6 };
    } else if (kind === 'QUAD_LASER') {
      this.box = { x, y: y - 3, width: 22, height: 6 };
    } else if (kind === 'TURRET_SPREAD') {
      this.box = { x, y: y - 4, width: 16, height: 8 };
    } else if (kind === 'EMERALD_LASER') {
      this.box = { x, y: y - 2.5, width: 24, height: 5 };
    } else if (kind === 'PHASER_BEAM') {
      this.box = { x, y: y - 8, width: 960, height: 16 };
      this.maxLifeTime = 0.25; // Continuous pulse beam
    } else if (kind === 'ENEMY_BULLET') {
      this.box = { x: x - 4, y: y - 4, width: 8, height: 8 };
      this.radius = 4;
    } else if (kind === 'MEGABOMB') {
      this.box = { x: x - 10, y: y - 10, width: 20, height: 20 };
      this.maxLifeTime = 1.6;
    } else if (kind === 'BEAM_LASER') {
      this.box = { x, y: y - 9, width: 960, height: 18 };
      this.maxLifeTime = 1.2;
    } else if (kind === 'HOMING_MISSILE') {
      this.box = { x: x - 6, y: y - 4, width: 14, height: 8 };
      this.maxLifeTime = 4.0;
    } else {
      this.box = { x, y, width: 8, height: 8 };
    }
  }

  public update(dt: number, particleSystem?: ParticleSystem, enemies?: Entity[]): void {
    this.lifeTime += dt;
    if (this.lifeTime >= this.maxLifeTime) {
      this.isDead = true;
      return;
    }

    if (
      this.kind === 'PLASMA' ||
      this.kind === 'QUAD_LASER' ||
      this.kind === 'TURRET_SPREAD' ||
      this.kind === 'EMERALD_LASER'
    ) {
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.box.x = this.position.x;
      this.box.y = this.position.y - this.box.height / 2;
      if (this.position.x > 990 || this.position.y < -40 || this.position.y > 580) {
        this.isDead = true;
      }
    } else if (this.kind === 'PHASER_BEAM') {
      this.box.x = this.position.x;
      this.box.y = this.position.y - 8;
    } else if (this.kind === 'ENEMY_BULLET') {
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.box.x = this.position.x - this.radius;
      this.box.y = this.position.y - this.radius;

      if (
        this.position.x < -30 ||
        this.position.x > 990 ||
        this.position.y < -30 ||
        this.position.y > 570
      ) {
        this.isDead = true;
      }
    } else if (this.kind === 'MEGABOMB') {
      // Rapidly expand EMP shockwave
      this.bombRadius += (this.maxBombRadius - this.bombRadius) * 4.5 * dt;
      this.box = {
        x: this.position.x - this.bombRadius,
        y: this.position.y - this.bombRadius,
        width: this.bombRadius * 2,
        height: this.bombRadius * 2,
      };
    } else if (this.kind === 'BEAM_LASER') {
      this.box.x = this.position.x;
      this.box.y = this.position.y - this.beamHeight / 2;
    } else if (this.kind === 'HOMING_MISSILE') {
      // Find nearest alive enemy if we don't have one
      if (enemies && enemies.length > 0) {
        let closestDist = Infinity;
        let bestTarget: Entity | null = null;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.isDead && e.position.x > this.position.x - 50) {
            const dx = e.position.x - this.position.x;
            const dy = e.position.y - this.position.y;
            const dist = dx * dx + dy * dy;
            if (dist < closestDist) {
              closestDist = dist;
              bestTarget = e;
            }
          }
        }
        if (bestTarget) {
          this.targetPos = { x: bestTarget.position.x, y: bestTarget.position.y };
        }
      }

      // Steer towards target
      if (this.targetPos) {
        const dx = this.targetPos.x - this.position.x;
        const dy = this.targetPos.y - this.position.y;
        const desiredAngle = Math.atan2(dy, dx);
        // Turn smoothly
        let angleDiff = desiredAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), dt * 7.0);
      }

      const speed = 460;
      this.velocity.x = Math.cos(this.angle) * speed;
      this.velocity.y = Math.sin(this.angle) * speed;

      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.box.x = this.position.x - 7;
      this.box.y = this.position.y - 4;

      // Emit smoke/spark trail
      if (particleSystem && Math.random() > 0.3) {
        particleSystem.emitSparks(
          this.position.x - Math.cos(this.angle) * 8,
          this.position.y - Math.sin(this.angle) * 8,
          1,
          '#ffaa00'
        );
      }

      if (this.position.x > 980 || this.position.y < -30 || this.position.y > 570) {
        this.isDead = true;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.kind === 'PLASMA') {
      // High-energy glowing cyan dual plasma bolt
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';

      ctx.beginPath();
      ctx.ellipse(this.position.x + 8, this.position.y, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (this.kind === 'QUAD_LASER') {
      // Star Wars X-Wing Crimson Red Quad Laser
      ctx.shadowColor = '#ff2244';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';

      ctx.beginPath();
      ctx.ellipse(this.position.x + 10, this.position.y, 11, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ff2244';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (this.kind === 'TURRET_SPREAD') {
      // Millennium Falcon Heavy Gold Turret Blaster
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';

      ctx.beginPath();
      ctx.ellipse(this.position.x + 8, this.position.y, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.kind === 'EMERALD_LASER') {
      // TIE Phantom High-Speed Green Imperial Laser
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';

      ctx.beginPath();
      ctx.ellipse(this.position.x + 12, this.position.y, 12, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (this.kind === 'PHASER_BEAM') {
      // Star Trek Enterprise Continuous Amber Phaser Beam
      const flicker = 0.8 + 0.2 * Math.sin(this.lifeTime * 50);
      ctx.globalAlpha = flicker;

      // Outer amber glow
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255, 170, 0, 0.45)';
      ctx.fillRect(this.position.x, this.position.y - 7, this.beamWidth, 14);

      // Core white-gold laser
      ctx.fillStyle = '#fff8e0';
      ctx.fillRect(this.position.x, this.position.y - 2, this.beamWidth, 4);
    } else if (this.kind === 'ENEMY_BULLET') {
      // Glowing crimson/amber enemy bullet
      ctx.shadowColor = '#ff2255';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';

      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius - 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.kind === 'MEGABOMB') {
      // Expanding EMP blast wave
      const alpha = Math.max(0, 1 - this.lifeTime / this.maxLifeTime);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 25;

      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.bombRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Second inner ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, Math.max(0, this.bombRadius * 0.75), 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.kind === 'BEAM_LASER') {
      // Piercing full-screen laser beam
      const flicker = 0.8 + 0.2 * Math.sin(this.lifeTime * 40);
      ctx.globalAlpha = flicker;

      // Outer glow
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(this.position.x, this.position.y - this.beamHeight, this.beamWidth, this.beamHeight * 2);

      // Core white laser
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.position.x, this.position.y - 3, this.beamWidth, 6);
    } else if (this.kind === 'HOMING_MISSILE') {
      // Sleek missile body
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate(this.angle);

      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';

      // Missile cone
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -4);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();

      // Rear engine nozzle fire
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(-6, -2);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-6, 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
