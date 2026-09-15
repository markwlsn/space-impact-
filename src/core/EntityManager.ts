import {
  BoundingBox,
  PickupType,
  BossEntity,
} from '../types';
import { PlayerShip } from '../entities/PlayerShip';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Pickup } from '../entities/Pickup';
import { BossMollusk } from '../entities/BossMollusk';
import { BossSentinel } from '../entities/BossSentinel';
import { ParticleSystem } from '../graphics/ParticleSystem';
import { CameraShake } from '../graphics/CameraShake';
import { Renderer } from '../graphics/Renderer';
import { soundSynthesizer } from '../audio/SoundSynthesizer';
import { shopManager } from '../ui/ShopManager';

export class EntityManager {
  public player: PlayerShip;
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public pickups: Pickup[] = [];
  public boss: BossEntity | null = null;

  // Score & Combo System (FR-13)
  public score: number = 0;
  public comboMultiplier: number = 1.0;
  public comboStreak: number = 0;
  public maxCombo: number = 1.0;
  public enemiesDestroyed: number = 0;

  constructor() {
    this.player = new PlayerShip();
  }

  public resetAll(): void {
    this.player.reset();
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.boss = null;
    this.score = 0;
    this.comboMultiplier = 1.0;
    this.comboStreak = 0;
    this.maxCombo = 1.0;
    this.enemiesDestroyed = 0;
  }

  public setBoss(boss: BossEntity | null): void {
    this.boss = boss;
  }

  public spawnEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }

  public spawnPickup(x: number, y: number, type: PickupType): void {
    this.pickups.push(new Pickup(Math.random().toString(), x, y, type));
  }

  public update(
    dt: number,
    particleSystem: ParticleSystem,
    cameraShake: CameraShake,
    renderer: Renderer
  ): void {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, particleSystem, this.enemies);
      if (proj.isDead) {
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      pickup.update(dt);
      if (pickup.isDead) {
        this.pickups.splice(i, 1);
      }
    }

    // 3. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, this.player.position, this.projectiles);
      if (enemy.isDead) {
        this.enemies.splice(i, 1);
      }
    }

    // 4. Update Boss
    if (this.boss && !this.boss.isDead) {
      if (this.boss instanceof BossMollusk) {
        this.boss.update(dt, this.player.position, this.projectiles, particleSystem, cameraShake);
      } else if (this.boss instanceof BossSentinel) {
        this.boss.update(dt, this.player.position, this.projectiles, particleSystem, cameraShake);
      } else {
        this.boss.update(dt);
      }
    }

    // 5. Check Spatial Collisions
    this.checkCollisions(particleSystem, cameraShake, renderer);
  }

  private checkAABB(box1: BoundingBox, box2: BoundingBox): boolean {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }

  private checkCollisions(
    particleSystem: ParticleSystem,
    cameraShake: CameraShake,
    renderer: Renderer
  ): void {
    // A. Player Projectiles vs Enemies & Boss & Boss Shield Drones
    for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
      const proj = this.projectiles[pIdx];
      if (proj.owner !== 'PLAYER' || proj.isDead) continue;

      // Special Megabomb EMP wave behavior: vaporize enemy bullets
      if (proj.kind === 'MEGABOMB') {
        for (let bIdx = this.projectiles.length - 1; bIdx >= 0; bIdx--) {
          const enemyBullet = this.projectiles[bIdx];
          if (enemyBullet.owner === 'ENEMY') {
            const dx = enemyBullet.position.x - proj.position.x;
            const dy = enemyBullet.position.y - proj.position.y;
            if (dx * dx + dy * dy <= proj.bombRadius * proj.bombRadius) {
              enemyBullet.isDead = true;
              particleSystem.emitSparks(enemyBullet.position.x, enemyBullet.position.y, 4, '#00f0ff');
            }
          }
        }
      }

      // Check Boss Sentinel Shield Drones (T11)
      let absorbedByDrone = false;
      if (this.boss instanceof BossSentinel && !this.boss.isDead) {
        for (let d = 0; d < this.boss.drones.length; d++) {
          const drone = this.boss.drones[d];
          if (!drone.isDead && this.checkAABB(proj.box, drone.box)) {
            // Hit shield drone!
            absorbedByDrone = true;
            particleSystem.emitSparks(proj.position.x, proj.position.y, 6, '#00f0ff');
            soundSynthesizer.playImpact();
            this.boss.damageDrone(d, proj.damage, particleSystem);
            if (proj.kind !== 'BEAM_LASER' && proj.kind !== 'MEGABOMB') {
              proj.isDead = true;
            }
            break;
          }
        }
      }
      if (absorbedByDrone && proj.kind !== 'BEAM_LASER' && proj.kind !== 'MEGABOMB') {
        continue;
      }

      // Check Normal Enemies
      for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
        const enemy = this.enemies[eIdx];
        if (enemy.isDead || enemy.type === 'LASER_GATE') continue;

        let hit = false;
        if (proj.kind === 'MEGABOMB') {
          const dx = enemy.position.x - proj.position.x;
          const dy = enemy.position.y - proj.position.y;
          hit = dx * dx + dy * dy <= proj.bombRadius * proj.bombRadius;
        } else {
          hit = this.checkAABB(proj.box, enemy.box);
        }

        if (hit) {
          // Inflict damage (FR-7)
          enemy.takeDamage(proj.damage, proj.position.x);
          particleSystem.emitSparks(
            proj.position.x,
            proj.position.y,
            proj.kind === 'BEAM_LASER' ? 4 : 8,
            '#ffea00'
          );
          soundSynthesizer.playImpact();

          if (proj.kind !== 'BEAM_LASER' && proj.kind !== 'MEGABOMB') {
            proj.isDead = true;
          }

          if (enemy.isDead) {
            this.onEnemyDestroyed(enemy, particleSystem, cameraShake);
          }
          if (proj.kind !== 'BEAM_LASER' && proj.kind !== 'MEGABOMB') break;
        }
      }

      // Check Boss Core
      if (this.boss && !this.boss.isDead) {
        let hitBoss = false;
        if (proj.kind === 'MEGABOMB') {
          const dx = this.boss.position.x - proj.position.x;
          const dy = this.boss.position.y - proj.position.y;
          hitBoss = dx * dx + dy * dy <= proj.bombRadius * proj.bombRadius;
        } else {
          hitBoss = this.checkAABB(proj.box, this.boss.box);
        }

        if (hitBoss) {
          this.boss.takeDamage(proj.damage);
          particleSystem.emitSparks(proj.position.x, proj.position.y, 8, '#ff3366');
          soundSynthesizer.playImpact();

          if (proj.kind !== 'BEAM_LASER' && proj.kind !== 'MEGABOMB') {
            proj.isDead = true;
          }

          if (this.boss.isDefeated) {
            this.onBossDestroyed(this.boss, particleSystem, cameraShake);
          }
        }
      }
    }

    // B. Enemy Projectiles & Hazards vs Player Ship (FR-5)
    if (!this.player.isDead && !this.player.isInvulnerable) {
      // 1. Enemy Bullets
      for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
        const proj = this.projectiles[pIdx];
        if (proj.owner === 'ENEMY' && !proj.isDead) {
          if (this.checkAABB(proj.box, this.player.box)) {
            proj.isDead = true;
            this.damagePlayer(proj.damage, particleSystem, cameraShake, renderer);
            break;
          }
        }
      }

      // 2. Enemy Direct Collisions
      for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
        const enemy = this.enemies[eIdx];
        if (enemy.isDead) continue;

        if (enemy.type === 'LASER_GATE') {
          // Check active laser gate beam collision
          if (
            enemy.isGateActive &&
            Math.abs(this.player.position.x - enemy.position.x) < 18 &&
            this.player.position.y > 50 &&
            this.player.position.y < 490
          ) {
            this.damagePlayer(25, particleSystem, cameraShake, renderer);
            break;
          }
        } else if (this.checkAABB(enemy.box, this.player.box)) {
          // Direct hull collision
          this.damagePlayer(20, particleSystem, cameraShake, renderer);
          enemy.takeDamage(40);
          if (enemy.isDead) {
            this.onEnemyDestroyed(enemy, particleSystem, cameraShake);
          }
          break;
        }
      }

      // 3. Boss Special Hazards (Charged Beams & Sweeping Lasers)
      if (this.boss && !this.boss.isDead) {
        if (this.boss instanceof BossMollusk && this.boss.checkBeamCollision(this.player.box)) {
          this.damagePlayer(35, particleSystem, cameraShake, renderer);
        } else if (
          this.boss instanceof BossSentinel &&
          this.boss.checkLaserSweepCollision(this.player.box)
        ) {
          this.damagePlayer(25, particleSystem, cameraShake, renderer);
        }
      }
    }

    // C. Pickups vs Player Ship (FR-8)
    for (let pIdx = this.pickups.length - 1; pIdx >= 0; pIdx--) {
      const pickup = this.pickups[pIdx];
      if (!pickup.isDead && this.checkAABB(pickup.box, this.player.box)) {
        pickup.isDead = true;
        if (pickup.type === 'WEAPON_MEGABOMB') {
          this.player.addSecondaryAmmo('MEGABOMB', 1);
          particleSystem.emitFloatingText(pickup.position.x, pickup.position.y - 15, '+1 MEGABOMB', '#ff0055');
        } else if (pickup.type === 'WEAPON_BEAM') {
          this.player.addSecondaryAmmo('BEAM_LASER', 1);
          particleSystem.emitFloatingText(pickup.position.x, pickup.position.y - 15, '+1 HYPER BEAM', '#00ffff');
        } else if (pickup.type === 'WEAPON_HOMING') {
          this.player.addSecondaryAmmo('HOMING_MISSILE', 3);
          particleSystem.emitFloatingText(pickup.position.x, pickup.position.y - 15, '+3 HOMING SALVO', '#ffaa00');
        } else if (pickup.type === 'REPAIR') {
          this.player.heal(25);
          particleSystem.emitFloatingText(pickup.position.x, pickup.position.y - 15, '+25 HULL REPAIR', '#00ff66');
        } else if (pickup.type === 'GOLD_COIN') {
          shopManager.addGold(25);
          soundSynthesizer.playCoinInsert();
          particleSystem.emitFloatingText(pickup.position.x, pickup.position.y - 15, '+25 GOLD ✪', '#ffea00');
        }
      }
    }
  }

  private damagePlayer(
    amount: number,
    particleSystem: ParticleSystem,
    cameraShake: CameraShake,
    renderer: Renderer
  ): void {
    // Millennium Falcon passive: 25% collision & incoming damage reduction
    const effectiveDamage = this.player.shipId === 'MILLENNIUM_FALCON' ? Math.max(1, Math.round(amount * 0.75)) : amount;
    const tookDamage = this.player.takeDamage(effectiveDamage);
    if (!tookDamage) return;

    // Trigger visual and auditory feedback (FR-5, FR-10)
    renderer.triggerDamageFlash();
    cameraShake.addTrauma(0.5);
    particleSystem.emitExplosion(this.player.position.x, this.player.position.y, 1.2, '#ff0055');

    // Reset combo multiplier on damage (FR-13)
    this.comboMultiplier = 1.0;
    this.comboStreak = 0;
    particleSystem.emitFloatingText(this.player.position.x, this.player.position.y - 30, 'COMBO LOST', '#ff2255');
  }

  private onEnemyDestroyed(
    enemy: Enemy,
    particleSystem: ParticleSystem,
    cameraShake: CameraShake
  ): void {
    this.enemiesDestroyed++;

    // Increment combo multiplier (FR-13)
    this.comboStreak++;
    this.comboMultiplier = Math.min(5.0, 1.0 + Math.floor(this.comboStreak / 4) * 0.5);
    if (this.comboMultiplier > this.maxCombo) {
      this.maxCombo = this.comboMultiplier;
    }

    const earnedScore = Math.floor(enemy.scoreValue * this.comboMultiplier);
    this.score += earnedScore;

    // Explosions and screenshake (FR-10)
    soundSynthesizer.playExplosion(enemy.isElite ? 1.8 : 1.0);
    cameraShake.addTrauma(enemy.isElite ? 0.4 : 0.2);
    particleSystem.emitExplosion(
      enemy.position.x,
      enemy.position.y,
      enemy.isElite ? 2.0 : 1.2,
      enemy.isElite ? '#ffea00' : '#ff0055'
    );

    const comboLabel = this.comboMultiplier > 1.0 ? ` (x${this.comboMultiplier.toFixed(1)})` : '';
    particleSystem.emitFloatingText(
      enemy.position.x,
      enemy.position.y - 15,
      `+${earnedScore}${comboLabel}`,
      enemy.isElite ? '#ffea00' : '#00f0ff'
    );

    // Drop gold coins (45% regular, 100% elite)
    if (enemy.isElite || Math.random() < 0.45) {
      this.spawnPickup(enemy.position.x, enemy.position.y, 'GOLD_COIN');
    }

    // Drop capsule if elite or lucky roll (FR-8)
    if (enemy.isElite || Math.random() < 0.12) {
      const dropTypes: PickupType[] = [
        'WEAPON_MEGABOMB',
        'WEAPON_BEAM',
        'WEAPON_HOMING',
        'REPAIR',
      ];
      const selected = dropTypes[Math.floor(Math.random() * dropTypes.length)];
      this.spawnPickup(enemy.position.x, enemy.position.y, selected);
    }
  }

  private onBossDestroyed(
    boss: BossEntity,
    particleSystem: ParticleSystem,
    cameraShake: CameraShake
  ): void {
    const bossScore = Math.floor(10000 * this.comboMultiplier);
    this.score += bossScore;

    // Massive gold reward for boss takedown
    shopManager.addGold(500);

    soundSynthesizer.playExplosion(3.5);
    cameraShake.addTrauma(1.0);
    particleSystem.emitExplosion(boss.position.x, boss.position.y, 4.0, '#ffea00');
    particleSystem.emitFloatingText(
      boss.position.x,
      boss.position.y - 40,
      `BOSS DESTROYED! +${bossScore}`,
      '#ffff00'
    );
    particleSystem.emitFloatingText(
      boss.position.x,
      boss.position.y - 65,
      '+500 GOLD ✪',
      '#ffea00'
    );
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    // 1. Draw Pickups
    this.pickups.forEach((p) => p.draw(ctx));

    // 2. Draw Enemies
    this.enemies.forEach((e) => e.draw(ctx));

    // 3. Draw Boss
    if (this.boss && !this.boss.isDead) {
      this.boss.draw(ctx);
    }

    // 4. Draw Projectiles
    this.projectiles.forEach((p) => p.draw(ctx));

    // 5. Draw Player
    this.player.draw(ctx);
  }
}
