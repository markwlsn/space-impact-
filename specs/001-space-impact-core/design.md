# Design: Space Impact Modernized

**Spec ID:** 001-space-impact-core  
**Status:** Approved  
**Traces to:** requirements.md v1.0  

## 1. Approach
The game is architected as an object-oriented, decoupled 2D game engine built on TypeScript and native HTML5 Canvas 2D. To avoid 404 image and audio asset loading errors, procedural vector rendering (with canvas `ctx.shadowBlur` and `globalCompositeOperation = 'lighter'`) delivers a modern neon cyber aesthetic, while the Web Audio API synthesizes crisp chiptune and punchy retro sound effects in real time.

## 2. Architecture & Modules

```
                        [ GameEngine ]
                      (60 FPS Main Loop)
                              |
      +---------------+-------+-------+---------------+
      |               |               |               |
[InputHandler]  [EntityManager]  [Renderer]   [SoundSynthesizer]
(Keys/Gamepad/   (Player/Enemies/ (Canvas 2D/  (Web Audio Oscillators/
 Touch)          Bullets/Pickups) Glow/Shake)   Envelopes/Noise)
                      |               |
               [ParticleSystem]  [Starfield]
```

### Module Breakdown
- **`GameEngine` (`src/core/GameEngine.ts`)**:
  - Manages `requestAnimationFrame` loop with fixed timestep delta accumulation (`1/60s`).
  - Controls game states (`TITLE`, `PLAYING`, `PAUSED`, `GAME_OVER`, `STAGE_CLEAR`).
  - Coordinates tick execution: `input.update() -> state.update(dt) -> renderer.render()`.
- **`InputHandler` (`src/core/InputHandler.ts`)**:
  - Event listeners for `keydown`, `keyup`, touch events, and Gamepad polling API.
  - Normalizes directional vector `(dx, dy)` and action states (`primaryFire`, `secondaryFire`, `pause`).
- **`EntityManager` (`src/core/EntityManager.ts`)**:
  - Maintains active pools of `PlayerShip`, `Enemy`, `Projectile`, and `Pickup` entities.
  - Handles spatial collision detection (AABB bounding box checks with circle hitboxes for bullets).
- **`PlayerShip` (`src/entities/PlayerShip.ts`)**:
  - Position, velocity, acceleration, health, invulnerability frames, secondary weapon inventory.
  - Generates thruster particles continuously at rear nozzle coordinates.
- **`StarfieldManager` (`src/graphics/StarfieldManager.ts`)**:
  - 3-tier horizontal parallax scrolling (nebula clusters, distant stars, fast stars).
  - Procedural twinkling and speed boosting during boost/warp states.
- **`Renderer` (`src/graphics/Renderer.ts`)**:
  - Handles logical canvas resizing (960x540) and CSS aspect-ratio containment.
  - Multi-pass rendering: Background starfield -> Particles -> Entities (with glow) -> Post-FX & Screen Shake -> HUD.
- **`ParticleSystem` (`src/graphics/ParticleSystem.ts`)**:
  - High-performance particle pooling for sparks, engine trails, explosions, and shockwaves.
- **`SoundSynthesizer` (`src/audio/SoundSynthesizer.ts`)**:
  - Native Web Audio graph containing Gain nodes, Oscillators (`sawtooth`, `square`, `sine`), and white/brown noise buffer generators.

## 3. Data Model & Entity Contracts

```typescript
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

export interface Entity {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  box: BoundingBox;
  isDead: boolean;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}
```

## 4. Alternatives Considered
| Option | Rejected Because |
|---|---|
| Heavy game engine (Phaser / Pixi.js via npm) | Unnecessary bloat; standard HTML5 Canvas 2D with hardware-accelerated composite operations easily sustains 60 FPS for hundreds of entities with zero external npm dependencies. |
| Pre-rendered PNG sprite sheets | Risk of missing asset paths or image loading delays; procedural canvas vector rendering creates infinite resolution crispness, glowing neon trails, and immediate bootup. |
| Pre-recorded audio WAV/MP3 files | Large bundle size and potential audio decode failures; Web Audio API synthesis gives 100% reliability, dynamic pitch shifts, and zero latency. |

## 5. Risks & Mitigations
- **Canvas Blur / Blurry Scaling on Retina Screens:**
  - *Mitigation:* Canvas internal buffer dimensions set to 960x540 while CSS style sets `width: 100%`, `height: 100%`, `object-fit: contain`, and `image-rendering: pixelated` or crisp vector anti-aliasing.
- **Web Audio Autoplay Restrictions:**
  - *Mitigation:* Context is initialized lazily upon first user interaction (keypress or click on Title screen).

## 6. Testing Strategy
- Unit and integration validation via Vite TypeScript build check (`npm run build`).
- In-browser interactive manual verification loop via `npm run dev`.

## 7. Rollout / Chat Handoff Plan
- **Chat 1 (Current):** Setup Vite, Specs (001), Engine, Canvas Viewport, PlayerShip 8-way movement, Dual-laser blaster, Parallax Starfield (T1-T4).
- **Chat 2:** Enemies, Waves, Pickups, Iconic Nokia Secondary Weapons, VFX Particles, Audio Engine, Stage 1 Boss (T5-T10).
- **Chat 3:** Stage 2, Boss 2, State Machine, HUD/UI, High Scores, Gamepad/Touch controls, Phase 6 Validation & Acceptance (T11-T15).

## Change Log
| Date | Change | Reason |
|---|---|---|
| 2026-09-15 | Initial baseline architecture | Spec-Driven Development Playbook Phase 3 baseline. |
| 2026-09-15 | Stage 2, Boss 2 (The Core Sentinel), Gamepad & Touch controls, procedural Web Audio BGM | Phase 7 Spec Sync reflecting full feature completion. |
