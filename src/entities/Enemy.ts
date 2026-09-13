import { Entity, Vector2D, BoundingBox, EnemyType } from '../types';
import { Projectile } from './Projectile';

export class Enemy implements Entity {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public box: BoundingBox;
  public isDead: boolean = false;
  public type: EnemyType;
  public isElite: boolean = false;

  public health: number;
  public maxHealth: number;
  public scoreValue: number;

  // Pattern behavior timers
  private time: number = 0;
  private startY: number;
  private shootCooldown: number;

  // Laser Gate specific state
  public isGateActive: boolean = true;
  private gateCycleTimer: number = 0;

  constructor(id: string, x: number, y: number, type: EnemyType, isElite: boolean = false) {
    this.id = id;
    this.position = { x, y };
    this.startY = y;
    this.type = type;
    this.isElite = isElite;

    if (type === 'SCOUT') {
      this.velocity = { x: -160, y: 0 };
      this.health = isElite ? 40 : 20;
      this.box = { x: x - 16, y: y - 12, width: 32, height: 24 };
      this.shootCooldown = 1.2 + Math.random() * 1.5;
      this.scoreValue = isElite ? 250 : 100;
    } else if (type === 'SWARMER') {
      this.velocity = { x: -240, y: 0 };
      this.health = isElite ? 30 : 15;
      this.box = { x: x - 12, y: y - 10, width: 24, height: 20 };
      this.shootCooldown = 999; // Swarmers attack via collision
      this.scoreValue = isElite ? 200 : 80;
    } else if (type === 'BEETLE') {
      this.velocity = { x: -90, y: 0 };
      this.health = isElite ? 120 : 60;
      this.box = { x: x - 22, y: y - 18, width: 44, height: 36 };
      this.shootCooldown = 1.8 + Math.random();
      this.scoreValue = isElite ? 500 : 250;
    } else if (type === 'TENTACLE') {
      this.velocity = { x: -120, y: 0 };
      this.health = isElite ? 80 : 40;
      this.box = { x: x - 25, y: y - 15, width: 50, height: 30 };
      this.shootCooldown = 2.0;
      this.scoreValue = isElite ? 350 : 150;
    } else if (type === 'LASER_GATE') {
      this.velocity = { x: -60, y: 0 };
      this.health = 9999; // Indestructible mechanical hazard
      this.box = { x: x - 15, y: 0, width: 30, height: 540 };
      this.shootCooldown = 999;
      this.scoreValue = 0;
    } else {
      // FORTRESS_TURRET
      this.velocity = { x: -60, y: 0 };
      this.health = isElite ? 90 : 45;
      this.box = { x: x - 20, y: y - 20, width: 40, height: 40 };
      this.shootCooldown = 1.5;
      this.scoreValue = 200;
    }

    this.maxHealth = this.health;
  }

  public takeDamage(amount: number, hitX?: number): void {
    if (this.type === 'LASER_GATE') return; // Gates are terrain hazards

    // Armored Beetle front armor damage reduction
    if (this.type === 'BEETLE' && hitX !== undefined && hitX > this.position.x - 5) {
      amount *= 0.35; // 65% reduction from front
    }

    this.health -= amount;
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  public update(dt: number, playerPos?: Vector2D, projectiles?: Projectile[]): void {
    this.time += dt;

    if (this.type === 'SCOUT') {
      // Sinusoidal flight pattern
      this.position.x += this.velocity.x * dt;
      this.position.y = this.startY + Math.sin(this.time * 3.5) * 55;
      this.box.x = this.position.x - 16;
      this.box.y = this.position.y - 12;

      // Shoot forward bullet
      this.shootCooldown -= dt;
      if (this.shootCooldown <= 0 && projectiles && this.position.x < 900) {
        projectiles.push(
          new Projectile(
            Math.random().toString(),
            this.position.x - 18,
            this.position.y,
            -340,
            0,
            'ENEMY',
            'ENEMY_BULLET',
            10
          )
        );
        this.shootCooldown = 2.2 + Math.random() * 1.5;
      }
    } else if (this.type === 'SWARMER') {
      // Fast dash angled towards player
      if (playerPos && this.time < 0.6) {
        const dy = playerPos.y - this.position.y;
        this.velocity.y = Math.sign(dy) * Math.min(Math.abs(dy) * 2.5, 180);
      }
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.box.x = this.position.x - 12;
      this.box.y = this.position.y - 10;
    } else if (this.type === 'BEETLE') {
      // Slow heavy march
      this.position.x += this.velocity.x * dt;
      this.box.x = this.position.x - 22;
      this.box.y = this.position.y - 18;

      // 3-way spread shot
      this.shootCooldown -= dt;
      if (this.shootCooldown <= 0 && projectiles && this.position.x < 920) {
        const angles = [-0.25, 0, 0.25];
        const bulletSpeed = 260;
        for (const angle of angles) {
          projectiles.push(
            new Projectile(
              Math.random().toString(),
              this.position.x - 20,
              this.position.y,
              -Math.cos(angle) * bulletSpeed,
              Math.sin(angle) * bulletSpeed,
              'ENEMY',
              'ENEMY_BULLET',
              12
            )
          );
        }
        this.shootCooldown = 2.4;
      }
    } else if (this.type === 'TENTACLE') {
      // Undulating serpent
      this.position.x += this.velocity.x * dt;
      this.position.y = this.startY + Math.sin(this.time * 4.0) * 80;
      this.box.x = this.position.x - 25;
      this.box.y = this.position.y - 15;

      this.shootCooldown -= dt;
      if (this.shootCooldown <= 0 && projectiles && this.position.x < 900) {
        // Aimed shot at player
        let vx = -280;
        let vy = 0;
        if (playerPos) {
          const dx = playerPos.x - this.position.x;
          const dy = playerPos.y - this.position.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            vx = (dx / len) * 300;
            vy = (dy / len) * 300;
          }
        }
        projectiles.push(
          new Projectile(
            Math.random().toString(),
            this.position.x - 20,
            this.position.y,
            vx,
            vy,
            'ENEMY',
            'ENEMY_BULLET',
            12
          )
        );
        this.shootCooldown = 2.5;
      }
    } else if (this.type === 'LASER_GATE') {
      this.position.x += this.velocity.x * dt;
      this.box.x = this.position.x - 15;

      // Cycle laser gate: 2.5s ACTIVE, 2.0s OFF, 0.8s WARNING
      this.gateCycleTimer += dt;
      const cycleTotal = 5.3;
      const phase = this.gateCycleTimer % cycleTotal;
      if (phase < 2.5) {
        this.isGateActive = true;
      } else {
        this.isGateActive = false;
      }
    } else if (this.type === 'FORTRESS_TURRET') {
      this.position.x += this.velocity.x * dt;
      this.box.x = this.position.x - 20;
      this.box.y = this.position.y - 20;

      this.shootCooldown -= dt;
      if (this.shootCooldown <= 0 && projectiles && playerPos && this.position.x < 920) {
        const dx = playerPos.x - this.position.x;
        const dy = playerPos.y - this.position.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          projectiles.push(
            new Projectile(
              Math.random().toString(),
              this.position.x - 15,
              this.position.y,
              (dx / len) * 320,
              (dy / len) * 320,
              'ENEMY',
              'ENEMY_BULLET',
              14
            )
          );
        }
        this.shootCooldown = 2.0;
      }
    }

    if (this.position.x < -80) {
      this.isDead = true;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    const glowColor = this.isElite ? '#ffea00' : this.type === 'BEETLE' ? '#ff3366' : '#ff0055';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.isElite ? 16 : 8;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = this.isElite ? 2.5 : 1.8;
    ctx.fillStyle = '#100512';

    if (this.type === 'SCOUT') {
      // Sleek angular scout craft
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(8, -12);
      ctx.lineTo(14, -6);
      ctx.lineTo(6, 0);
      ctx.lineTo(14, 6);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Scout eye core
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(-4, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'SWARMER') {
      // Dart-like rapid interceptor
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(10, -9);
      ctx.lineTo(4, 0);
      ctx.lineTo(10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'BEETLE') {
      // Heavy armored beetle with shielded nose
      ctx.beginPath();
      ctx.arc(0, 0, 18, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(12, 16);
      ctx.lineTo(16, 0);
      ctx.lineTo(12, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy front armor plate
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 18, -Math.PI / 3, Math.PI / 3, true);
      ctx.stroke();
    } else if (this.type === 'TENTACLE') {
      // Biomechanical multi-joint worm
      for (let i = 0; i < 4; i++) {
        const segX = i * 11;
        const segY = Math.sin(this.time * 5 + i) * 6;
        ctx.beginPath();
        ctx.arc(segX, segY, 10 - i * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Glowing bio-eye
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(-2, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'LASER_GATE') {
      // Reset translation to draw vertical barrier across height
      ctx.restore();
      ctx.save();

      const topEmitterY = 50;
      const botEmitterY = 490;
      const gateX = this.position.x;

      // Emitter nodes
      ctx.fillStyle = '#330515';
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 10;

      ctx.fillRect(gateX - 12, 0, 24, topEmitterY);
      ctx.strokeRect(gateX - 12, 0, 24, topEmitterY);

      ctx.fillRect(gateX - 12, botEmitterY, 24, 540 - botEmitterY);
      ctx.strokeRect(gateX - 12, botEmitterY, 24, 540 - botEmitterY);

      // Laser beam between emitters
      const phase = this.gateCycleTimer % 5.3;
      if (phase < 2.5) {
        // Full lethal laser beam
        ctx.strokeStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(gateX, topEmitterY);
        ctx.lineTo(gateX, botEmitterY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(gateX, topEmitterY);
        ctx.lineTo(gateX, botEmitterY);
        ctx.stroke();
      } else if (phase > 4.5) {
        // Warning strobe line
        ctx.strokeStyle = 'rgba(255, 0, 80, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(gateX, topEmitterY);
        ctx.lineTo(gateX, botEmitterY);
        ctx.stroke();
      }
      ctx.restore();
      return;
    } else if (this.type === 'FORTRESS_TURRET') {
      // Octagonal fortress turret
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Barrel
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-20, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}
