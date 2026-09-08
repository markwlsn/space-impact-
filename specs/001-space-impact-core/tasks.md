# Tasks: Space Impact Modernized

**Spec ID:** 001-space-impact-core  
**Derived from:** requirements.md v1.0, design.md v1.0  

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

### Phase 5 Session 1: Engine Foundation & Player Core (Current Chat)
- [x] **T1** — Project Scaffolding & Canvas Viewport
  - Refs: FR-14, NFR-1, NFR-3, NFR-4 · Design §1, §2
  - Acceptance: Vite + TypeScript project initialized at `C:\Users\User.MIS\Documents\Projects\space-impact`, canvas 960x540 viewport styled with letterboxing, verified with `npm run build`.
  - Depends on: none

- [x] **T2** — Core GameEngine & Fixed Timestep Loop
  - Refs: FR-14, NFR-1 · Design §2
  - Acceptance: `GameEngine` class orchestrating `requestAnimationFrame` with delta time, decoupled update and render steps, and basic FPS counter.
  - Depends on: T1

- [x] **T3** — PlayerShip Movement, Thruster FX & Primary Dual-Lasers
  - Refs: FR-1, FR-2, FR-3 · Design §2, §3
  - Acceptance: Player responds to WASD / Arrow keys in 8 directions, strictly clamped within screen bounds, emits animated glowing rocket exhaust particles, and fires dual glowing laser bolts at 8 shots/sec.
  - Depends on: T2

- [x] **T4** — Multi-Layer Parallax Starfield & Visual Glow Pipeline
  - Refs: FR-4, NFR-2 · Design §2
  - Acceptance: 3-layer scrolling parallax starfield with distant nebula gas, twinkling stars, and foreground cosmic dust with glowing additive canvas composite.
  - Depends on: T2

---

### Phase 5 Session 2: Combat Systems, VFX Engine, Audio & Boss 1 (Chat 2)
- [ ] **T5** — Enemy Archetypes & Wave Timeline Spawner
  - Refs: FR-6 · Design §2, §3
  - Acceptance: 4 distinct enemy flight types (Scouts, Swarmers, Armored Beetles, Tentacles) spawning on timed waves.
  - Depends on: T3, T4

- [ ] **T6** — Iconic Nokia Secondary Weapons & Weapon Pickup Capsules
  - Refs: FR-8, FR-9 · Design §2, §3
  - Acceptance: Droppable glowing weapon capsules; Megabomb (screen blast), Piercing Beam Laser, and Homing Missiles.
  - Depends on: T5

- [ ] **T7** — Modernized Visual FX, Particle System & Camera Shake
  - Refs: FR-10 · Design §2
  - Acceptance: Explosion debris, spark deflections on hit, and exponential-decay screen shake.
  - Depends on: T5, T6

- [ ] **T8** — Procedural Web Audio Synthesizer
  - Refs: FR-11 · Design §2
  - Acceptance: Real-time sound synthesis for blasters, heavy explosions, powerup chimes, and hit sounds.
  - Depends on: T2

- [ ] **T9** — Stage 1 Boss: The Cybernetic Mollusk
  - Refs: FR-12 · Design §2, §3
  - Acceptance: Multi-part segmented boss with tentacle spreads, warning laser beam, and health bar.
  - Depends on: T5, T7, T8

- [ ] **T10** — Spatial Collision Detection & Score Combo System
  - Refs: FR-5, FR-7, FR-13 · Design §2, §3
  - Acceptance: Damage calculation, player invulnerability frames, score multiplier streaks.
  - Depends on: T5, T9

---

### Phase 5 Session 3: Stage 2, UI State Machine, Controls & Validation (Chat 3)
- [ ] **T11** — Stage 2 & Boss 2: The Core Sentinel
  - Refs: FR-6, FR-12 · Design §2
  - Acceptance: Cyber Fortress biome, rotating drone shield rings, and core attack phases.
  - Depends on: T9, T10

- [ ] **T12** — Complete Game State Machine & Nokia-Themed Menus
  - Refs: FR-14 · Design §2
  - Acceptance: Title Screen with retro Nokia tribute, Pause menu, Game Over, and Stage Clear screens.
  - Depends on: T10, T11

- [ ] **T13** — LocalStorage High Score Leaderboard
  - Refs: FR-13 · Design §2
  - Acceptance: Top 5 high scores saved and displayed across browser reloads.
  - Depends on: T12

- [ ] **T14** — Multi-Input Accessibility (Gamepad & Mobile Touch Controls)
  - Refs: FR-15 · Design §2
  - Acceptance: Gamepad API bindings and on-screen virtual Nokia keypad/touch controls.
  - Depends on: T12

- [ ] **T15** — Procedural Background Music & Phase 6 Validation
  - Refs: FR-11, NFR-1..4 · Design §7, Playbook §5
  - Acceptance: Synthesized retro synthwave loop and complete requirements walk-through report.
  - Depends on: T1 to T14

---

## Discovered Work
*(Noticed mid-implementation, out of scope — triage later)*
- None currently recorded.
