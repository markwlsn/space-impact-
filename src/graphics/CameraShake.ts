import { Vector2D } from '../types';

export class CameraShake {
  private trauma: number = 0;
  private maxOffset: number = 18;
  private maxAngle: number = 0.05; // radians
  private time: number = 0;

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public update(dt: number): void {
    this.time += dt * 30;
    // Exponential decay
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
  }

  public getShake(): { offset: Vector2D; angle: number } {
    if (this.trauma <= 0.001) {
      return { offset: { x: 0, y: 0 }, angle: 0 };
    }

    // Shake is proportional to trauma squared
    const shake = this.trauma * this.trauma;
    const offsetX = this.maxOffset * shake * (Math.sin(this.time * 1.7) + (Math.random() * 2 - 1) * 0.3);
    const offsetY = this.maxOffset * shake * (Math.cos(this.time * 2.1) + (Math.random() * 2 - 1) * 0.3);
    const angle = this.maxAngle * shake * Math.sin(this.time * 1.3);

    return {
      offset: { x: offsetX, y: offsetY },
      angle,
    };
  }

  public apply(ctx: CanvasRenderingContext2D): void {
    const shake = this.getShake();
    ctx.save();
    if (shake.offset.x !== 0 || shake.offset.y !== 0 || shake.angle !== 0) {
      ctx.translate(shake.offset.x, shake.offset.y);
      if (shake.angle !== 0) {
        ctx.translate(480, 270);
        ctx.rotate(shake.angle);
        ctx.translate(-480, -270);
      }
    }
  }

  public restore(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}
