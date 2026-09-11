import {
  Entity,
  Vector2D,
  BoundingBox,
  InputState,
  SecondaryWeaponType,
  SecondaryWeaponInventory,
} from '../types';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { Projectile } from './Projectile';
import { soundSynthesizer } from '../audio/SoundSynthesizer';

export class PlayerShip implements Entity {
  public id: string = 'player';
  public position: Vector2D;
  public velocity: Vector2D = { x: 0, y: 0 };
  public box: BoundingBox;
  public isDead: boolean = false;

  // Flight dynamics
  private speed: number = 360; // Max speed in px/s
  private width: number = 42;
  private height: number = 22;

  // Health & Shield
  public health: number = 100;
  public maxHealth: number = 100;
  public isInvulnerable: boolean = false;
  public invulnerabilityTimer: number = 0;
  public invulnerabilityDuration: number = 1.2; // FR-5: 1.2s invulnerability

  // Primary Weapons: 8 rounds/second = 0.125s cooldown (FR-3)
  private primaryCooldown: number = 0;
  private readonly primaryFireRate: number = 0.125;

  // Secondary Weapons inventory (FR-9)
  public activeSecondary: SecondaryWeaponType = 'MEGABOMB';
  public inventory: Record<SecondaryWeaponType, SecondaryWeaponInventory> = {
    MEGABOMB: { type: 'MEGABOMB', ammo: 3, maxAmmo: 5 },
    BEAM_LASER: { type: 'BEAM_LASER', ammo: 2, maxAmmo: 4 },
    HOMING_MISSILE: { type: 'HOMING_MISSILE', ammo: 6, maxAmmo: 12 },
  };
  public get ammoMegabomb(): number { return this.inventory.MEGABOMB.ammo; }
  public get ammoBeam(): number { return this.inventory.BEAM_LASER.ammo; }
  public get ammoHoming(): number { return this.inventory.HOMING_MISSILE.ammo; }
  private secondaryCooldown: number = 0;

  constructor(x: number = 100, y: number = 270) {
    this.position = { x, y };
    this.box = {
      x: x - this.width / 2,
      y: y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  public reset(x: number = 100, y: number = 270): void {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.health = this.maxHealth;
    this.isDead = false;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.inventory.MEGABOMB.ammo = 3;
    this.inventory.BEAM_LASER.ammo = 2;
    this.inventory.HOMING_MISSILE.ammo = 6;
  }

  public cycleSecondary(): void {
    const types: SecondaryWeaponType[] = ['MEGABOMB', 'BEAM_LASER', 'HOMING_MISSILE'];
    const idx = types.indexOf(this.activeSecondary);
    this.activeSecondary = types[(idx + 1) % types.length];
    soundSynthesizer.playUiBeep();
  }

  public takeDamage(amount: number): boolean {
    if (this.isInvulnerable || this.isDead) return false;

    this.health = Math.max(0, this.health - amount);
    this.isInvulnerable = true;
    this.invulnerabilityTimer = this.invulnerabilityDuration;
    soundSynthesizer.playDamage();

    if (this.health <= 0) {
      this.isDead = true;
    }
    return true;
  }

  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
    soundSynthesizer.playPowerup();
  }

  public addSecondaryAmmo(type: SecondaryWeaponType, amount: number): void {
    const inv = this.inventory[type];
    inv.ammo = Math.min(inv.maxAmmo, inv.ammo + amount);
    this.activeSecondary = type; // Auto-equip picked up weapon
    soundSynthesizer.playPowerup();
  }

  public update(
    dt: number,
    input?: InputState,
    particleSystem?: ParticleSystem,
    projectiles?: Projectile[]
  ): void {
    // Invulnerability timer countdown
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= dt;
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
      }
    }

    if (this.primaryCooldown > 0) this.primaryCooldown -= dt;
    if (this.secondaryCooldown > 0) this.secondaryCooldown -= dt;

    if (!input) return;

    // Movement calculation (FR-1: 8-way directional acceleration clamped within bounds)
    let mx = input.moveVector.x;
    let my = input.moveVector.y;

    // Normalize diagonal movement
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const targetVx = mx * this.speed;
    const targetVy = my * this.speed;

    // Smooth acceleration
    this.velocity.x += (targetVx - this.velocity.x) * 15 * dt;
    this.velocity.y += (targetVy - this.velocity.y) * 15 * dt;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Viewport clamping [padding from borders]
    const minX = this.width / 2 + 10;
    const maxX = 960 - this.width / 2 - 10;
    const minY = this.height / 2 + 15;
    const maxY = 540 - this.height / 2 - 15;

    this.position.x = Math.max(minX, Math.min(maxX, this.position.x));
    this.position.y = Math.max(minY, Math.min(maxY, this.position.y));

    // Update bounding box
    this.box.x = this.position.x - this.width / 2;
    this.box.y = this.position.y - this.height / 2;

    // Thruster exhaust particles (FR-2)
    if (particleSystem) {
      const isMoving = Math.abs(this.velocity.x) > 10 || Math.abs(this.velocity.y) > 10;
      particleSystem.emitThruster(this.position.x - this.width / 2, this.position.y, isMoving);
    }

    // Primary fire handling (FR-3: Dual plasma bolts at 8 shots/second)
    if (input.primaryFire && this.primaryCooldown <= 0 && projectiles) {
      this.firePrimary(projectiles);
      this.primaryCooldown = this.primaryFireRate;
    }

    // Secondary fire handling (FR-9)
    if (input.secondaryFire && this.secondaryCooldown <= 0 && projectiles) {
      this.fireSecondary(projectiles, particleSystem);
    }
  }

  private firePrimary(projectiles: Projectile[]): void {
    // Dual plasma blasters offset from top and bottom wingtips
    const topY = this.position.y - 7;
    const botY = this.position.y + 7;
    const spawnX = this.position.x + 18;

    projectiles.push(
      new Projectile(Math.random().toString(), spawnX, topY, 750, 0, 'PLAYER', 'PLASMA', 15)
    );
    projectiles.push(
      new Projectile(Math.random().toString(), spawnX, botY, 750, 0, 'PLAYER', 'PLASMA', 15)
    );

    soundSynthesizer.playLaser();
  }

  private fireSecondary(projectiles: Projectile[], particleSystem?: ParticleSystem): void {
    const inv = this.inventory[this.activeSecondary];
    if (inv.ammo <= 0) return;

    inv.ammo--;

    if (this.activeSecondary === 'MEGABOMB') {
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          this.position.x + 20,
          this.position.y,
          0,
          0,
          'PLAYER',
          'MEGABOMB',
          180
        )
      );
      soundSynthesizer.playMegabomb();
      this.secondaryCooldown = 1.0;
      if (particleSystem) {
        particleSystem.emitFloatingText(this.position.x, this.position.y - 25, 'EMP BLAST!', '#00f0ff');
      }
    } else if (this.activeSecondary === 'BEAM_LASER') {
      projectiles.push(
        new Projectile(
          Math.random().toString(),
          this.position.x + 20,
          this.position.y,
          0,
          0,
          'PLAYER',
          'BEAM_LASER',
          80
        )
      );
      soundSynthesizer.playBeamLaser();
      this.secondaryCooldown = 1.2;
      if (particleSystem) {
        particleSystem.emitFloatingText(this.position.x, this.position.y - 25, 'HYPER BEAM!', '#00ffff');
      }
    } else if (this.activeSecondary === 'HOMING_MISSILE') {
      // Launch 3 homing missiles spread out
      const angles = [-0.35, 0, 0.35];
      for (const angle of angles) {
        const missile = new Projectile(
          Math.random().toString(),
          this.position.x,
          this.position.y,
          0,
          0,
          'PLAYER',
          'HOMING_MISSILE',
          45
        );
        missile.angle = angle;
        projectiles.push(missile);
      }
      soundSynthesizer.playHomingLaunch();
      this.secondaryCooldown = 0.5;
      if (particleSystem) {
        particleSystem.emitFloatingText(this.position.x, this.position.y - 25, 'HOMING SALVO!', '#ffaa00');
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    // Invulnerability flicker (FR-5)
    if (this.isInvulnerable && Math.floor(this.invulnerabilityTimer * 20) % 2 === 0) {
      return; // Skip draw frame to create rapid strobe effect
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    // Subtle pitch tilt based on vertical velocity
    const tilt = (this.velocity.y / this.speed) * 0.12;
    ctx.rotate(tilt);

    // Modernized Nokia Ship: Neon Vector Fighter
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00f0ff';
    ctx.fillStyle = '#0a1a2f';
    ctx.lineWidth = 2;

    // Main hull path
    ctx.beginPath();
    ctx.moveTo(20, 0); // Nose tip
    ctx.lineTo(8, -5);
    ctx.lineTo(-6, -11); // Wingtop
    ctx.lineTo(-12, -10);
    ctx.lineTo(-18, -4);
    ctx.lineTo(-20, 0); // Rear engine
    ctx.lineTo(-18, 4);
    ctx.lineTo(-12, 10);
    ctx.lineTo(-6, 11); // Wingbottom
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing cockpit canopy
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(3, 0, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing cannons (dual plasma nozzles)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(12, -8);
    ctx.moveTo(-4, 8);
    ctx.lineTo(12, 8);
    ctx.stroke();

    // Rear engine glowing core
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(-19, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
