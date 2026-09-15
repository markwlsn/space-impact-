import {
  Entity,
  Vector2D,
  BoundingBox,
  InputState,
  SecondaryWeaponType,
  SecondaryWeaponInventory,
  ShipId,
  ShipDefinition,
} from '../types';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { Projectile } from './Projectile';
import { soundSynthesizer } from '../audio/SoundSynthesizer';
import { shopManager } from '../ui/ShopManager';

export class PlayerShip implements Entity {
  public id: string = 'player';
  public position: Vector2D;
  public velocity: Vector2D = { x: 0, y: 0 };
  public box: BoundingBox;
  public isDead: boolean = false;

  // Ship Configuration
  public shipId: ShipId = 'NOKIA_VIPER';
  private speed: number = 360;
  private width: number = 42;
  private height: number = 22;

  // Health & Shield
  public health: number = 100;
  public maxHealth: number = 100;
  public isInvulnerable: boolean = false;
  public invulnerabilityTimer: number = 0;
  public invulnerabilityDuration: number = 1.2;

  // Primary Weapons
  private primaryCooldown: number = 0;
  private primaryFireRate: number = 0.125;

  // Passive ability timers
  private r2RepairTimer: number = 0;

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
    this.applyShip(shopManager.getEquippedShip());
  }

  public applyShip(def: ShipDefinition): void {
    this.shipId = def.id;
    this.speed = def.speed;
    this.maxHealth = def.maxHealth;
    this.health = def.maxHealth;
    this.primaryFireRate = def.fireRate;
    this.invulnerabilityDuration = def.id === 'TIE_PHANTOM' ? 2.4 : 1.2;

    if (def.id === 'MILLENNIUM_FALCON') {
      this.width = 46;
      this.height = 30;
    } else if (def.id === 'USS_ENTERPRISE') {
      this.width = 48;
      this.height = 28;
    } else if (def.id === 'TIE_PHANTOM') {
      this.width = 40;
      this.height = 26;
    } else if (def.id === 'X_WING') {
      this.width = 44;
      this.height = 26;
    } else {
      this.width = 42;
      this.height = 22;
    }
    this.box.width = this.width;
    this.box.height = this.height;
  }

  public reset(x: number = 100, y: number = 270): void {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.applyShip(shopManager.getEquippedShip());
    this.isDead = false;
    this.isInvulnerable = false;
    this.invulnerabilityTimer = 0;
    this.inventory.MEGABOMB.ammo = 3;
    this.inventory.BEAM_LASER.ammo = 2;
    this.inventory.HOMING_MISSILE.ammo = 6;
    this.r2RepairTimer = 0;
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

    // X-Wing R2 Astromech Passive: 2% hull repair every 3 seconds
    if (this.shipId === 'X_WING' && !this.isDead && this.health < this.maxHealth) {
      this.r2RepairTimer += dt;
      if (this.r2RepairTimer >= 3.0) {
        this.r2RepairTimer = 0;
        const healAmt = Math.max(1, Math.round(this.maxHealth * 0.02));
        this.heal(healAmt);
        if (particleSystem) {
          particleSystem.emitFloatingText(this.position.x, this.position.y - 18, `R2 REPAIR +${healAmt}`, '#00ffcc');
        }
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

    // Primary fire handling
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
    const spawnX = this.position.x + 18;

    if (this.shipId === 'X_WING') {
      // Quad converging red laser cannons from S-foils
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX, this.position.y - 14, 850, 0, 'PLAYER', 'QUAD_LASER', 12)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX + 4, this.position.y - 5, 850, 0, 'PLAYER', 'QUAD_LASER', 12)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX + 4, this.position.y + 5, 850, 0, 'PLAYER', 'QUAD_LASER', 12)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX, this.position.y + 14, 850, 0, 'PLAYER', 'QUAD_LASER', 12)
      );
      soundSynthesizer.playLaser();
    } else if (this.shipId === 'MILLENNIUM_FALCON') {
      // Heavy 3-way spread gold heavy turrets
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX, this.position.y, 680, 0, 'PLAYER', 'TURRET_SPREAD', 24)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX - 2, this.position.y - 8, 670, -85, 'PLAYER', 'TURRET_SPREAD', 22)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX - 2, this.position.y + 8, 670, 85, 'PLAYER', 'TURRET_SPREAD', 22)
      );
      soundSynthesizer.playLaser();
    } else if (this.shipId === 'USS_ENTERPRISE') {
      // Twin continuous amber phaser sweep
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX + 5, this.position.y - 6, 920, 0, 'PLAYER', 'PHASER_BEAM', 20)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX + 5, this.position.y + 6, 920, 0, 'PLAYER', 'PHASER_BEAM', 20)
      );
      soundSynthesizer.playBeamLaser();
    } else if (this.shipId === 'TIE_PHANTOM') {
      // Ultra-rapid emerald imperial blasters
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX + 4, this.position.y - 7, 960, 0, 'PLAYER', 'EMERALD_LASER', 14)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX + 4, this.position.y + 7, 960, 0, 'PLAYER', 'EMERALD_LASER', 14)
      );
      soundSynthesizer.playLaser();
    } else {
      // Default NOKIA_VIPER: Dual cyan plasma blasters
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX, this.position.y - 7, 750, 0, 'PLAYER', 'PLASMA', 15)
      );
      projectiles.push(
        new Projectile(Math.random().toString(), spawnX, this.position.y + 7, 750, 0, 'PLAYER', 'PLASMA', 15)
      );
      soundSynthesizer.playLaser();
    }
  }

  private fireSecondary(projectiles: Projectile[], particleSystem?: ParticleSystem): void {
    const inv = this.inventory[this.activeSecondary];
    if (inv.ammo <= 0) return;

    inv.ammo--;

    // Enterprise passive: +50% explosive damage for secondary torpedoes
    const multiplier = this.shipId === 'USS_ENTERPRISE' ? 1.5 : 1.0;

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
          Math.round(180 * multiplier)
        )
      );
      soundSynthesizer.playMegabomb();
      this.secondaryCooldown = 1.0;
      if (particleSystem) {
        particleSystem.emitFloatingText(
          this.position.x,
          this.position.y - 25,
          multiplier > 1 ? 'QUANTUM EMP BOMB!' : 'EMP BLAST!',
          '#00f0ff'
        );
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
          Math.round(80 * multiplier)
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
          Math.round(45 * multiplier)
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

    switch (this.shipId) {
      case 'X_WING':
        this.drawXWing(ctx);
        break;
      case 'MILLENNIUM_FALCON':
        this.drawMillenniumFalcon(ctx);
        break;
      case 'USS_ENTERPRISE':
        this.drawEnterprise(ctx);
        break;
      case 'TIE_PHANTOM':
        this.drawTIEPhantom(ctx);
        break;
      case 'NOKIA_VIPER':
      default:
        this.drawNokiaViper(ctx);
        break;
    }

    ctx.restore();
  }

  /** Procedural Vector Model: Nokia Viper MK-IV */
  private drawNokiaViper(ctx: CanvasRenderingContext2D): void {
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

    // Wing cannons
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
  }

  /** Procedural Vector Model: T-65 X-Wing Starfighter */
  private drawXWing(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = '#ff3344';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ff3344';
    ctx.fillStyle = '#14141c';
    ctx.lineWidth = 2;

    // Long pointed fuselage nose
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(6, -4);
    ctx.lineTo(-12, -5);
    ctx.lineTo(-20, -3);
    ctx.lineTo(-20, 3);
    ctx.lineTo(-12, 5);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4 S-Foils (Upper & Lower attack position wings)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Top-outer foil
    ctx.moveTo(-6, -4);
    ctx.lineTo(-12, -14);
    ctx.lineTo(14, -14);
    // Bottom-outer foil
    ctx.moveTo(-6, 4);
    ctx.lineTo(-12, 14);
    ctx.lineTo(14, 14);
    ctx.stroke();

    // Wingtip laser cannon barrels
    ctx.strokeStyle = '#ff3344';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(14, -14);
    ctx.lineTo(24, -14);
    ctx.moveTo(14, 14);
    ctx.lineTo(24, 14);
    ctx.stroke();

    // Astromech R2 Unit (Blue and Silver dome)
    ctx.fillStyle = '#00aaff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit canopy (translucent amber)
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(8, 0, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 Rear Ion Engine Nozzles
    ctx.fillStyle = '#ff5500';
    ctx.beginPath();
    ctx.arc(-20, -5, 2.2, 0, Math.PI * 2);
    ctx.arc(-20, 5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Procedural Vector Model: YT-1300 Millennium Falcon */
  private drawMillenniumFalcon(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ffea00';
    ctx.fillStyle = '#1c1a14';
    ctx.lineWidth = 2;

    // Circular saucer hull
    ctx.beginPath();
    ctx.arc(-2, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Forward Cargo Mandibles
    ctx.beginPath();
    ctx.moveTo(10, -7);
    ctx.lineTo(22, -6);
    ctx.lineTo(22, -2);
    ctx.lineTo(12, -2);
    ctx.lineTo(12, 2);
    ctx.lineTo(22, 2);
    ctx.lineTo(22, 6);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Starboard Offset Cockpit & Corridor
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.lineTo(8, 14);
    ctx.lineTo(16, 12); // Cockpit capsule
    ctx.lineTo(18, 9);
    ctx.lineTo(14, 9);
    ctx.stroke();

    // Central Quad-Turret
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(-2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();

    // Round Sensor Radar Dish
    ctx.strokeStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(-5, -7, 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // Rear Sublight Drive (Cyan curved glow strip)
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-2, 0, 14, Math.PI * 0.75, Math.PI * 1.25);
    ctx.stroke();
  }

  /** Procedural Vector Model: USS Enterprise (Star Trek) */
  private drawEnterprise(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = '#44aaff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#44aaff';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2;

    // Primary Hull: Circular Saucer
    ctx.beginPath();
    ctx.arc(10, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bridge Dome & Vector Ring
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary Engineering Hull
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(-14, 0);
    ctx.stroke();

    // Angled Warp Pylons
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-12, -11);
    ctx.moveTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.stroke();

    // Twin Warp Nacelles
    ctx.fillStyle = '#0a1020';
    ctx.lineWidth = 1.5;
    // Top Nacelle
    ctx.strokeRect(-18, -13, 20, 4);
    ctx.fillRect(-18, -13, 20, 4);
    // Bottom Nacelle
    ctx.strokeRect(-18, 9, 20, 4);
    ctx.fillRect(-18, 9, 20, 4);

    // Glowing Red Bussard Collectors on front of nacelles
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(2, -11, 2.5, 0, Math.PI * 2);
    ctx.arc(2, 11, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Blue Warp Grills on rear of nacelles
    ctx.fillStyle = '#00aaff';
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.rect(-17, -12, 12, 2);
    ctx.rect(-17, 10, 12, 2);
    ctx.fill();
  }

  /** Procedural Vector Model: TIE Phantom Interceptor */
  private drawTIEPhantom(ctx: CanvasRenderingContext2D): void {
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#00ff66';
    ctx.fillStyle = '#0e1812';
    ctx.lineWidth = 2;

    // Central Spherical Eyeball Cockpit
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Octagonal Cockpit Viewport (Emerald glow)
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Tri-Wing Solar Array Wings (Top, Bottom, and Rear-Upper)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Top Wing
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(8, -14);
    ctx.lineTo(-14, -14);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.stroke();

    // Bottom Wing
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(8, 14);
    ctx.lineTo(-14, 14);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.stroke();

    // Cloaking Field Strobe / Emerald Wingtip Trim
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -14);
    ctx.lineTo(16, -14);
    ctx.moveTo(8, 14);
    ctx.lineTo(16, 14);
    ctx.stroke();

    // Dual Ion Engine Nozzles (Twin Crimson Pinpoints)
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(-7, -2, 1.8, 0, Math.PI * 2);
    ctx.arc(-7, 2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
