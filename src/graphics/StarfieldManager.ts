// Multi-Biome Parallax Starfield & Cyber Fortress Generator
// Complies with FR-4, NFR-2, and T11

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
  twinklePhase: number;
}

export interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

export interface CyberPillar {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  glowColor: string;
}

export class StarfieldManager {
  private width: number = 960;
  private height: number = 540;

  // Biome: 'SPACE' (Stage 1) or 'CYBER_FORTRESS' (Stage 2)
  private biome: 'SPACE' | 'CYBER_FORTRESS' = 'SPACE';
  private isWarping: boolean = false;
  private warpFactor: number = 1.0;

  // Stage 1 layers:
  private nebulae: NebulaCloud[] = [];
  private distantStars: Star[] = [];
  private midStars: Star[] = [];
  private foregroundStars: Star[] = [];

  // Stage 2 Cyber Fortress structures:
  private cyberPillars: CyberPillar[] = [];
  private gridOffset: number = 0;

  constructor(width: number = 960, height: number = 540) {
    this.width = width;
    this.height = height;
    this.initSpaceBiome();
    this.initCyberFortressBiome();
  }

  public setBiome(biome: 'SPACE' | 'CYBER_FORTRESS'): void {
    this.biome = biome;
  }

  public setWarpSpeed(isWarp: boolean): void {
    this.isWarping = isWarp;
  }

  private initSpaceBiome(): void {
    // 1. Deep nebula dust clouds (slowest layer)
    const nebulaColors = [
      'rgba(40, 10, 70, 0.25)',
      'rgba(10, 45, 80, 0.22)',
      'rgba(80, 20, 50, 0.18)',
    ];
    for (let i = 0; i < 6; i++) {
      this.nebulae.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 180 + Math.random() * 160,
        color: nebulaColors[i % nebulaColors.length],
        speed: 8 + Math.random() * 8,
      });
    }

    // 2. Distant stars (slow, dim, subtle twinkle)
    for (let i = 0; i < 90; i++) {
      this.distantStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 25 + Math.random() * 15,
        size: 1.0 + Math.random() * 0.8,
        color: Math.random() > 0.3 ? '#88ccff' : '#ffffff',
        alpha: 0.4 + Math.random() * 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // 3. Mid-distance stars
    for (let i = 0; i < 60; i++) {
      this.midStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 60 + Math.random() * 30,
        size: 1.8 + Math.random() * 1.0,
        color: Math.random() > 0.5 ? '#00f0ff' : '#99e6ff',
        alpha: 0.7 + Math.random() * 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    // 4. Fast foreground cosmic dust / star clusters
    for (let i = 0; i < 35; i++) {
      this.foregroundStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: 130 + Math.random() * 60,
        size: 2.2 + Math.random() * 1.4,
        color: '#ffffff',
        alpha: 0.85 + Math.random() * 0.15,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private initCyberFortressBiome(): void {
    // Techno pillars and mechanical gate outlines scrolling in background
    for (let i = 0; i < 8; i++) {
      this.cyberPillars.push({
        x: (i * (this.width / 4)) + Math.random() * 40,
        y: i % 2 === 0 ? 0 : this.height - 180,
        width: 60 + Math.random() * 50,
        height: 120 + Math.random() * 80,
        speed: 45 + (i % 3) * 20,
        glowColor: i % 2 === 0 ? '#ff0055' : '#ffaa00',
      });
    }
  }

  public update(dt: number): void {
    // Warp speed acceleration
    if (this.isWarping) {
      this.warpFactor = Math.min(10.0, this.warpFactor + dt * 6.0);
    } else {
      this.warpFactor = Math.max(1.0, this.warpFactor - dt * 4.0);
    }

    const currentMultiplier = this.warpFactor;

    // Update Stage 1 space layers
    this.nebulae.forEach((nebula) => {
      nebula.x -= nebula.speed * currentMultiplier * dt;
      if (nebula.x + nebula.radius < 0) {
        nebula.x = this.width + nebula.radius;
        nebula.y = Math.random() * this.height;
      }
    });

    const updateStarList = (stars: Star[]) => {
      stars.forEach((star) => {
        star.x -= star.speed * currentMultiplier * dt;
        star.twinklePhase += dt * 3;
        if (star.x < 0) {
          star.x = this.width + Math.random() * 20;
          star.y = Math.random() * this.height;
        }
      });
    };

    updateStarList(this.distantStars);
    updateStarList(this.midStars);
    updateStarList(this.foregroundStars);

    // Update Stage 2 cyber fortress
    this.gridOffset = (this.gridOffset + 120 * currentMultiplier * dt) % 60;
    this.cyberPillars.forEach((pillar) => {
      pillar.x -= pillar.speed * currentMultiplier * dt;
      if (pillar.x + pillar.width < 0) {
        pillar.x = this.width + Math.random() * 80;
      }
    });
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.biome === 'SPACE') {
      this.drawSpaceBiome(ctx);
    } else {
      this.drawCyberFortressBiome(ctx);
    }

    ctx.restore();
  }

  private drawSpaceBiome(ctx: CanvasRenderingContext2D): void {
    // Deep backdrop clear
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Nebulae layer
    this.nebulae.forEach((nebula) => {
      const grad = ctx.createRadialGradient(
        nebula.x,
        nebula.y,
        10,
        nebula.x,
        nebula.y,
        nebula.radius
      );
      grad.addColorStop(0, nebula.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Stars rendering (with warp streak elongation if warping)
    const renderStars = (stars: Star[]) => {
      stars.forEach((star) => {
        const twinkle = 0.7 + 0.3 * Math.sin(star.twinklePhase);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.alpha * twinkle;

        if (this.warpFactor > 1.2) {
          // Elongate into streaks
          const streakLength = (star.speed * 0.15) * this.warpFactor;
          ctx.strokeStyle = star.color;
          ctx.lineWidth = star.size;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x + streakLength, star.y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    renderStars(this.distantStars);
    renderStars(this.midStars);
    renderStars(this.foregroundStars);
  }

  private drawCyberFortressBiome(ctx: CanvasRenderingContext2D): void {
    // Dark cybernetic purple/crimson gradient backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#150512');
    bgGrad.addColorStop(0.5, '#0a030c');
    bgGrad.addColorStop(1, '#150512');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Cyber perspective grid (ceiling and floor)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 100, 0.25)';
    ctx.lineWidth = 1;

    // Perspective horizontal lines on top and bottom
    const gridLines = 5;
    for (let i = 1; i <= gridLines; i++) {
      const topY = (i * 24);
      const botY = this.height - (i * 24);
      ctx.beginPath();
      ctx.moveTo(0, topY);
      ctx.lineTo(this.width, topY);
      ctx.moveTo(0, botY);
      ctx.lineTo(this.width, botY);
      ctx.stroke();
    }

    // Scrolling vertical grid lines
    for (let x = -this.gridOffset; x < this.width + 60; x += 60) {
      // Top ceiling grid
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 30, 120);
      ctx.stroke();

      // Bottom floor grid
      ctx.beginPath();
      ctx.moveTo(x - 30, this.height - 120);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    ctx.restore();

    // Distant background cyber fortress monoliths & conduits
    ctx.save();
    this.cyberPillars.forEach((pillar) => {
      ctx.fillStyle = 'rgba(25, 12, 35, 0.7)';
      ctx.strokeStyle = pillar.glowColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = pillar.glowColor;
      ctx.shadowBlur = 8;

      ctx.fillRect(pillar.x, pillar.y, pillar.width, pillar.height);
      ctx.strokeRect(pillar.x, pillar.y, pillar.width, pillar.height);

      // Tech details inside pillar
      ctx.beginPath();
      ctx.moveTo(pillar.x + 10, pillar.y + 15);
      ctx.lineTo(pillar.x + pillar.width - 10, pillar.y + 15);
      ctx.moveTo(pillar.x + 10, pillar.y + pillar.height - 15);
      ctx.lineTo(pillar.x + pillar.width - 10, pillar.y + pillar.height - 15);
      ctx.stroke();
    });
    ctx.restore();

    // Fast foreground digital cyber sparks
    ctx.fillStyle = '#ff3377';
    this.midStars.forEach((star) => {
      ctx.globalAlpha = star.alpha * 0.8;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
  }
}
