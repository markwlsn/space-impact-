import { FloatingText } from '../types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'circle' | 'line' | 'shockwave';
  maxRadius?: number;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private readonly maxParticles = 800;

  constructor() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2,
        color: '#00f0ff',
        alpha: 1,
        decay: 0.05,
        shape: 'circle',
        active: false,
      });
    }
  }

  private getInactiveParticle(): Particle | null {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        return this.particles[i];
      }
    }
    return null;
  }

  /** Emits animated thruster flame and propulsion glow trailing player nozzle (FR-2) */
  public emitThruster(x: number, y: number, isMoving: boolean): void {
    const p = this.getInactiveParticle();
    if (!p) return;

    p.active = true;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 4;
    p.vx = -120 - Math.random() * 80 - (isMoving ? 60 : 0);
    p.vy = (Math.random() - 0.5) * 35;
    p.radius = 2.5 + Math.random() * 3.5;
    p.color = Math.random() > 0.4 ? '#00f0ff' : '#0077ff';
    p.alpha = 0.9;
    p.decay = 2.5 + Math.random() * 1.5;
    p.shape = 'circle';
  }

  /** Emits hit-spark particles upon bullet collision (FR-7) */
  public emitSparks(x: number, y: number, count: number = 8, color: string = '#ffea00'): void {
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = 1.5 + Math.random() * 2;
      p.color = color;
      p.alpha = 1.0;
      p.decay = 2.0 + Math.random() * 2.0;
      p.shape = 'line';
    }
  }

  public emitHitSparks(x: number, y: number, _normalX: number = 0, _normalY: number = 0, color: string = '#ffff55'): void {
    this.emitSparks(x, y, 8, color);
  }

  public emitShockwave(x: number, y: number, maxRadius: number = 60, color: string = '#00f0ff'): void {
    const sw = this.getInactiveParticle();
    if (sw) {
      sw.active = true;
      sw.x = x;
      sw.y = y;
      sw.vx = 0;
      sw.vy = 0;
      sw.radius = 4;
      sw.maxRadius = maxRadius;
      sw.color = color;
      sw.alpha = 1.0;
      sw.decay = 1.5;
      sw.shape = 'shockwave';
    }
  }

  /** Emits burst of particle debris and smoke for explosions (FR-10) */
  public emitExplosion(x: number, y: number, magnitude: number = 1.0, baseColor: string = '#ff3366'): void {
    const particleCount = Math.floor(20 * Math.min(magnitude, 3));

    // Shockwave ring
    const sw = this.getInactiveParticle();
    if (sw) {
      sw.active = true;
      sw.x = x;
      sw.y = y;
      sw.vx = 0;
      sw.vy = 0;
      sw.radius = 4;
      sw.maxRadius = 35 * Math.min(magnitude, 3);
      sw.color = baseColor;
      sw.alpha = 0.9;
      sw.decay = 1.8;
      sw.shape = 'shockwave';
    }

    // Explosion debris particles
    const colors = [baseColor, '#ff9900', '#ffff55', '#ffffff'];
    for (let i = 0; i < particleCount; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 240 * Math.min(magnitude, 2.5);

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = 2 + Math.random() * 3.5 * Math.min(magnitude, 2);
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1.0;
      p.decay = 1.2 + Math.random() * 1.5;
      p.shape = Math.random() > 0.5 ? 'circle' : 'line';
    }
  }

  /** Emits floating combo score text */
  public emitFloatingText(x: number, y: number, text: string, color: string = '#00f0ff'): void {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: 0.9,
      vy: -40,
    });
  }

  public update(dt: number): void {
    // Update active particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;

      if (p.shape === 'shockwave' && p.maxRadius) {
        p.radius += (p.maxRadius - p.radius) * 10 * dt;
      }

      if (p.alpha <= 0) {
        p.active = false;
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life += dt;
      ft.alpha = Math.max(0, 1 - ft.life / ft.maxLife);

      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'line') {
        ctx.lineWidth = p.radius;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else if (p.shape === 'shockwave') {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw floating texts
    ctx.font = 'bold 14px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }

  public clear(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
    }
    this.floatingTexts = [];
  }
}
