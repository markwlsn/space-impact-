import { Entity, Vector2D, BoundingBox, PickupType } from '../types';

export class Pickup implements Entity {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public box: BoundingBox;
  public isDead: boolean = false;
  public type: PickupType;
  private time: number = 0;

  constructor(id: string, x: number, y: number, type: PickupType) {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: -60, y: 0 };
    this.box = { x: x - 14, y: y - 14, width: 28, height: 28 };
    this.type = type;
  }

  public update(dt: number): void {
    this.time += dt * 4;
    this.position.x += this.velocity.x * dt;
    this.position.y += Math.sin(this.time) * 35 * dt;

    this.box.x = this.position.x - 14;
    this.box.y = this.position.y - 14;

    if (this.position.x < -40) {
      this.isDead = true;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    let color = '#00f0ff';
    let label = 'B';

    if (this.type === 'WEAPON_MEGABOMB') {
      color = '#ff0055';
      label = 'M';
    } else if (this.type === 'WEAPON_BEAM') {
      color = '#00ffff';
      label = 'L';
    } else if (this.type === 'WEAPON_HOMING') {
      color = '#ffaa00';
      label = 'H';
    } else if (this.type === 'REPAIR') {
      color = '#00ff66';
      label = '+';
    } else if (this.type === 'GOLD_COIN') {
      color = '#ffea00';
      label = '✪';
    }

    // Outer rotating glowing capsule diamond
    ctx.rotate(this.time * 0.5);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-14, 0);
    ctx.closePath();
    ctx.stroke();

    // Inner glowing fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();

    // Reset rotation for text label
    ctx.rotate(-this.time * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);

    ctx.restore();
  }
}
