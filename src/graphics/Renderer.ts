import { CameraShake } from './CameraShake';
import { StarfieldManager } from './StarfieldManager';
import { ParticleSystem } from './ParticleSystem';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 960;
  private height: number = 540;

  private damageFlashAlpha: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context could not be initialized');
    }
    this.ctx = context;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public triggerDamageFlash(): void {
    this.damageFlashAlpha = 0.55;
  }

  public update(dt: number): void {
    if (this.damageFlashAlpha > 0) {
      this.damageFlashAlpha = Math.max(0, this.damageFlashAlpha - dt * 2.5);
    }
  }

  public beginFrame(starfield: StarfieldManager, cameraShake: CameraShake): void {
    const { offset, angle } = cameraShake.getShake();

    this.ctx.save();

    // Apply camera shake transform
    if (offset.x !== 0 || offset.y !== 0 || angle !== 0) {
      this.ctx.translate(this.width / 2, this.height / 2);
      this.ctx.rotate(angle);
      this.ctx.translate(-this.width / 2 + offset.x, -this.height / 2 + offset.y);
    }

    // Render background starfield / biome
    starfield.draw(this.ctx);
  }

  public renderParticles(particleSystem: ParticleSystem): void {
    particleSystem.draw(this.ctx);
  }

  public endFrame(): void {
    // Damage chromatic flash overlay
    if (this.damageFlashAlpha > 0.01) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.fillStyle = `rgba(255, 30, 70, ${this.damageFlashAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }

    this.ctx.restore();
  }
}
