# Space Impact // Retro-Futuristic Modernized Edition

A high-definition, 60 FPS modernization of the legendary Nokia 3310 side-scrolling shoot-'em-up *Space Impact*, engineered from scratch with TypeScript and HTML5 Canvas 2D.

![Space Impact Modernized](https://img.shields.io/badge/Stack-TypeScript%20%7C%20Vite%20%7C%20HTML5%20Canvas-00f0ff?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Work%20in%20Progress%20(Active%20Dev)-yellow?style=for-the-badge)
![External Assets](https://img.shields.io/badge/External%20Assets-0%20%28100%25%20Procedural%29-ff0055?style=for-the-badge)

> ⚠️ **IMPORTANT NOTE: THIS PROJECT IS CURRENTLY IN ACTIVE DEVELOPMENT AND IS NOT YET COMPLETE.**  
> Ongoing work includes additional boss attack patterns, weapon balancing, fine-tuning audio synthesizers, and continuous playtesting. Contributions and feedback are welcome!

---

## 📥 Cloning & Local Setup Instructions

Follow these steps to clone and run the game on your local machine:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or later recommended)
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/markwlsn/space-impact-.git
cd space-impact-
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch the Local Development Server
```bash
npm run dev
```
Open your web browser and navigate to the displayed local server URL (default: `http://localhost:3000`).

### 4. Build for Production
To create a minified, standalone production build:
```bash
npm run build
npm run preview
```

---

## Highlights & Constitutional Principles

- **Zero External Media Assets:** 100% of graphics (ships, enemy archetypes, bosses, projectiles, particles, starfields, and UI) are procedurally drawn with Canvas 2D vectors and glowing blend modes. All audio is synthesized in real time with the native Web Audio API.
- **Deterministic 60 FPS Engine:** Decoupled architecture separating input polling, fixed-timestep physics updates (`1/60s`), and rendering interpolation.
- **Universal Multi-Input Accessibility:**
  - Full desktop keyboard support.
  - Native Gamepad API integration (D-pad, analog thumbstick, face buttons, triggers).
  - Built-in on-screen virtual analog joystick and responsive action buttons for mobile and touch devices.
- **Retro-Modern Visual Aesthetic:** Glowing vector wireframes (`ctx.shadowBlur` and `globalCompositeOperation = 'lighter'`), multi-layer parallax scrolling, CRT scanline filter overlay, chromatic damage flash, and exponential-decay camera shake.

---

## Game Progression & Biomes

### Stage 1: Deep Space (Biome 1)
Fly through deep space with 3 parallax horizontal scrolling layers (cosmic dust nebulae, distant twinkling stars, and foreground star clusters).
- **Scout Drones:** Agile reconnaissance fighters flying in sinusoidal waveforms.
- **Swarm Interceptors:** High-speed direct-dive flyers.
- **Armored Beetles:** Heavily armored alien shells with 65% front damage reduction and 3-way spread cannons.
- **Tentacle Serpents:** Multi-segmented undulating space worms.
- **Stage 1 Climax Boss: The Cybernetic Mollusk**
  - Segmented nautilus shell with glowing conduits and 4 articulated waving tentacles.
  - Phase 1: Tentacle bullet arcs and wave sweeps.
  - Phase 2 (<50% HP): Telegraphed charged hyper-laser warning line followed by a devastating full-screen beam blast.

### Hyperspace Warp Transition
Upon defeating Boss 1, hyperspace warp drive engages with starfield streaking at 10x velocity and warp sound effects, bridging the journey into Stage 2.

### Stage 2: Cyber Fortress (Biome 2)
Infiltrate an alien techno-citadel with glowing crimson/amber perspective floor and ceiling grids, scrolling cybernetic conduits, and high-tech defense mechanisms.
- **Laser Gate Hazards:** Lethal vertical laser energy barriers cycling between active beams and safe cool-down windows.
- **Fortress Turrets:** Octagonal wall batteries tracking player coordinates.
- **Stage 2 Climax Boss: The Core Sentinel**
  - Central rotating hexagonal cybernetic core surrounded by counter-rotating rings.
  - **Orbiting Shield Drones:** 5 autonomous drones revolving around the core that intercept and absorb incoming player projectiles until destroyed.
  - **Homing Bullet Rings:** Expanding geometric rings of bullets that curve directly toward the player.
  - **Dual Sweeping Laser Arms:** Rotating 360° laser beams sweeping across the arena.
  - **Enraged Core Overload (<30% HP):** High-speed drone spinning and rapid spiral bullet hell patterns.

---

## Weapon Systems & Upgrades

### Primary Weapon
- **Dual Plasma Blasters:** 8 rounds per second (cadence: 0.125s) firing high-energy glowing cyan bolts from top and bottom wingtips.

### Iconic Secondary Weapons
- **Megabomb (EMP Shockwave):** Deploys an expanding EMP blast wave that vaporizes all active enemy projectiles on screen and inflicts catastrophic area damage.
- **Hyper Beam (Piercing Laser):** Discharges a thick, continuous high-energy piercing beam across the entire screen horizontal for 1.2 seconds, melting through all entities in its line of fire.
- **Homing Salvo (Micro-Missiles):** Launches a spread of 3 thrust-accelerated missiles that track the closest enemy with active steering and smoke trails.

### Weapon Capsules & Pickups
Elite golden enemies drop glowing capsules upon defeat:
- `[M]` **Megabomb Ammo (+1)**
- `[L]` **Hyper Beam Ammo (+1)**
- `[H]` **Homing Salvo Ammo (+3)**
- `[+]` **Hull Repair (+25% HP)**

---

## Controls Reference

| Action | Keyboard | Gamepad | Touch Screen |
|---|---|---|---|
| **Move 8-Way** | `W, A, S, D` or `Arrow Keys` | Left Analog Stick or D-Pad | Virtual Analog Stick (Left) |
| **Primary Laser** | `Space` or `Z` | `A` / `X` / `Right Trigger` | `FIRE` Button (Green) |
| **Secondary Weapon** | `X`, `Shift`, or `Ctrl` | `B` / `Y` / `Left Trigger` | `SPECIAL` Button (Pink) |
| **Cycle Weapon** | `Tab` or `C` | Bumpers (`LB` / `RB`) | `SWAP` Button |
| **Pause / Resume** | `Escape` or `P` | `Start` Button | `PAUSE` Button |
| **Mute Audio** | `M` (or Header Button) | - | Audio Toggle Header |
| **CRT Scanlines** | `C` (or Header Button) | - | CRT Toggle Header |

---

## Scoring & Leaderboard Persistence

- **Compounding Combo Multiplier:** Consecutive enemy eliminations without taking damage increase the score multiplier up to **5.0x** (`x1.0` -> `x1.5` -> `x2.0` -> `x3.0` -> `x5.0`). Taking damage resets the combo streak to 1.0x.
- **LocalStorage Top 5 Hall of Fame:** Scores persist across browser sessions. If a run qualifies for the Top 5, an interactive 3-character arcade initials entry prompt (`[A][A][A]`) is presented with retro confirmation chimes.

---

## Secrets & Combat Tips

1. **Beetle Armor Bypass:** Armored Beetles take 65% reduced damage from the front. Maneuver behind or above them, or use the Megabomb / Hyper Beam to pierce directly through their carapace.
2. **Core Sentinel Shield Breaker:** Use Homing Salvos or the Hyper Beam to quickly strip the rotating shield drones orbiting the Core Sentinel, exposing the vulnerable central core.
3. **Mollusk Hyper-Beam Dodge:** When the Cybernetic Mollusk charges its eye beam, a red dashed line telegraphes the target line for 1.2 seconds. Immediately clear that vertical corridor before the beam fires!
4. **Megabomb Bullet Eraser:** Save your Megabombs for boss bullet hell phases—the EMP shockwave erases every enemy bullet within its expanding radius.

---

## Development & Build Instructions

### Prerequisites
- Node.js 18+ and npm installed.

### Setup & Launch
```bash
# Clone or navigate to the project directory
cd "C:\Users\User.MIS\Documents\Projects\space-impact"

# Install dependencies (Vite + TypeScript)
npm install

# Start local development server
npm run dev
```
Open your browser at `http://localhost:5173`.

### Production Build & Type Checking
```bash
# Typecheck with TypeScript strict mode and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```
Production assets are output to `dist/` with zero warnings or errors.

---

## Architecture

```
src/
├── audio/
│   └── SoundSynthesizer.ts    # Web Audio synthesis for SFX & procedural synthwave arpeggiator BGM
├── core/
│   ├── EntityManager.ts       # Spatial collisions, drops, combo multiplier, entity pools
│   ├── GameEngine.ts          # 60 FPS main loop, stage 1 & 2 timelines, boss management
│   └── InputHandler.ts        # Keyboard, Gamepad API polling, Virtual Touch overlay controls
├── entities/
│   ├── BossMollusk.ts         # Stage 1 Boss: The Cybernetic Mollusk
│   ├── BossSentinel.ts        # Stage 2 Boss: The Core Sentinel (Shield Drones & Rings)
│   ├── Enemy.ts               # Scouts, Swarmers, Armored Beetles, Tentacles, Laser Gates, Turrets
│   ├── Pickup.ts              # Glowing droppable secondary weapon capsules & hull repairs
│   ├── PlayerShip.ts          # 8-way movement, invulnerability frames, primary & secondary weapons
│   └── Projectile.ts          # Dual plasma, enemy bullets, Megabomb, Beam Laser, Homing Missiles
├── graphics/
│   ├── CameraShake.ts         # Exponential-decay trauma camera shake
│   ├── ParticleSystem.ts      # Exhaust thrusters, sparks, explosions, shockwaves, floating text
│   ├── Renderer.ts            # Canvas 2D multi-pass rendering, glow passes, chromatic damage flash
│   └── StarfieldManager.ts    # 3-layer parallax scrolling for Deep Space & Cyber Fortress biomes
├── ui/
│   ├── HighScoreManager.ts    # LocalStorage Top 5 persistence with initials entry
│   └── UIManager.ts           # HUD, Nokia Title screen, Pause menu, Game Over, Victory, Initials
├── main.ts                    # Application bootstrap, canvas scaling, touch joystick binding
└── types.ts                   # Core interfaces, vectors, bounding boxes, state enums
```

---

## Credits
Tribute to the classic 2000 Nokia 3310 game *Space Impact*, modernised with 2026 web capabilities by Antigravity.
