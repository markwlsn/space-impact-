export interface Vector2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SecondaryWeaponType = 'MEGABOMB' | 'BEAM_LASER' | 'HOMING_MISSILE';

export type PickupType = 'WEAPON_MEGABOMB' | 'WEAPON_BEAM' | 'WEAPON_HOMING' | 'REPAIR';

export type EnemyType = 'SCOUT' | 'SWARMER' | 'BEETLE' | 'TENTACLE' | 'LASER_GATE' | 'FORTRESS_TURRET';

export type ProjectileOwner = 'PLAYER' | 'ENEMY';

export type GameState =
  | 'CINEMATIC_INTRO'
  | 'PILOT_ENTRY'
  | 'TITLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_WARP'
  | 'GAME_OVER'
  | 'VICTORY'
  | 'ENTER_HIGHSCORE';

export type StageId = number;

export interface Entity {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  box: BoundingBox;
  isDead: boolean;
  update(dt: number, ...args: any[]): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  vy: number;
}

export interface HighScoreRecord {
  initials: string;
  score: number;
  stage: number;
  date: string;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  primaryFire: boolean;
  secondaryFire: boolean;
  pause: boolean;
  moveVector: Vector2D;
}

export interface SecondaryWeaponInventory {
  type: SecondaryWeaponType;
  ammo: number;
  maxAmmo: number;
}

export interface BossEntity extends Entity {
  bossName: string;
  health: number;
  maxHealth: number;
  isDefeated: boolean;
  takeDamage(amount: number): void;
  getPhase(): number;
}
