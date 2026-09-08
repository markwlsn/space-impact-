# Requirements: Space Impact Modernized

**Spec ID:** 001-space-impact-core  
**Status:** Approved  
**Author:** Antigravity  
**Approved by / date:** User / 2026-09-15  

## 1. Problem Statement
The classic Nokia 3310 monochrome game *Space Impact* is a legendary side-scrolling shoot-'em-up, but modern players expect high-definition 60 FPS rendering, vivid retro-futuristic vector glow aesthetics, responsive 8-way controls, rich particle effects, dynamic screen shake, and synthesized sound effects without losing the nostalgic tight combat mechanics of the original.

## 2. Goals
- Deliver a fast, responsive side-scrolling shoot-'em-up runnable directly in any modern browser via Vite + TypeScript.
- Modernize the visual presentation with glowing vector lines, multi-depth parallax starfields, bloom lighting, and dynamic explosion physics.
- Recreate the classic ship handling, primary blaster mechanics, iconic secondary weapons (Megabomb, Laser Beam, Homing Missiles), and multi-phase boss encounters.
- Maintain zero external asset dependencies (100% procedurally generated visuals and synthesized Web Audio).

## 3. Non-Goals
- Real-time multiplayer or online matchmaking.
- Photorealistic 3D models (visuals strictly celebrate enhanced retro-futuristic 2D aesthetics).
- Complex server-side backend databases (score persistence utilizes browser LocalStorage).

## 4. User Stories
- **As a player**, I want responsive 8-way keyboard, gamepad, and touch controls so that I can deftly navigate through bullet patterns.
- **As a player**, I want my primary laser and secondary weapons to feel punchy with visual bloom, recoil, and audio feedback.
- **As a player**, I want diverse enemy flight patterns and boss mechanics to experience escalating challenge.
- **As a player**, I want my high score preserved across browser reloads to track my personal bests.

## 5. Functional Requirements (EARS)

| ID | Pattern | Requirement |
|---|---|---|
| **FR-1** | Event-driven | WHEN the player inputs directional commands (WASD/Arrow keys/D-pad), THE PlayerShip SHALL accelerate up to maximum velocity in the requested 8 directions clamped within viewport bounds. |
| **FR-2** | State-driven | WHILE the PlayerShip is moving or active, THE ParticleSystem SHALL emit animated thruster flame and propulsion glow particles trailing the engine exhaust. |
| **FR-3** | Event-driven | WHEN the fire primary button is held (Space / KeyZ), THE PlayerShip SHALL fire dual plasma laser bolts at a fixed cadence of 8 rounds per second. |
| **FR-4** | State-driven | WHILE the game loop is active, THE StarfieldManager SHALL scroll 3 distinct parallax layers (deep nebula dust, mid-distance stars, fast foreground star clusters) horizontally to create deep space illusion. |
| **FR-5** | State-driven | WHILE the PlayerShip takes collision or projectile damage, THE HealthSystem SHALL decrease player hull integrity, activate temporary invulnerability flicker (1.2 seconds), and trigger screen chromatic flash. |
| **FR-6** | Event-driven | WHEN the wave timeline reaches designated timestamps, THE EnemySpawner SHALL instantiate designated enemy flight formations (Scouts, Swarmers, Armored Beetles, Tentacles). |
| **FR-7** | Event-driven | WHEN a player projectile intersects an enemy bounding box, THE CollisionSystem SHALL inflict damage, produce hit-spark particles, and trigger a synthesized audio hit impact. |
| **FR-8** | Event-driven | WHEN an elite/golden enemy is destroyed, THE DropSystem SHALL spawn a glowing weapon capsule that awards secondary ammunition upon player contact. |
| **FR-9** | Event-driven | WHEN the secondary fire button (X / Shift / Ctrl) is pressed, THE WeaponSystem SHALL discharge the active equipped secondary weapon (Megabomb, Piercing Laser Beam, or Homing Torpedoes) and decrement secondary ammo. |
| **FR-10** | Event-driven | WHEN any entity is destroyed, THE FXEngine SHALL trigger a burst of particle debris and apply exponential-decay CameraShake proportional to explosion magnitude. |
| **FR-11** | Event-driven | WHEN audio events trigger (laser shot, impact, explosion, powerup, boss alarm), THE SoundSynthesizer SHALL generate procedural sound waves via Web Audio API oscillators and gain envelopes. |
| **FR-12** | State-driven | WHILE Stage 1 reaches the climax milestone, THE BossManager SHALL engage the Cybernetic Mollusk boss featuring multi-part health pools, tentacle barrage, and charge-beam attacks. |
| **FR-13** | Event-driven | WHEN enemies are eliminated without taking damage, THE ScoreManager SHALL increment score with a compounding combo multiplier and persist top scores to LocalStorage. |
| **FR-14** | Ubiquitous | THE GameStateMachine SHALL govern transitions between TITLE, PLAYING, PAUSED, GAME_OVER, and STAGE_VICTORY states. |
| **FR-15** | State-driven | WHERE touch or gamepad inputs are detected, THE InputHandler SHALL seamlessly translate input states alongside standard keyboard bindings. |

## 6. Non-Functional Requirements
- **NFR-1 (Framerate):** Steady 60 FPS on standard modern browser environments with requestAnimationFrame.
- **NFR-2 (Zero Assets):** All assets generated via HTML5 Canvas API and Web Audio API without network fetching.
- **NFR-3 (Resolution Independence):** Logical resolution fixed at 960x540 with CSS letterboxing preserving aspect ratio.
- **NFR-4 (Strict Type Safety):** Clean compilation under TypeScript strict mode with zero compile errors.

## 7. Edge Cases & Error States
- **Audio Context Suspension:** Web Audio automatically unlocks on first user gesture (click/keypress) per browser autoplay policies.
- **Window Blur/Focus:** Game automatically transitions to PAUSED when browser window loses focus to prevent player death.
- **Offscreen Entities:** Projectiles and enemies that fly completely off-screen are garbage-collected immediately.

## 8. Open Questions
*All core questions resolved during Phase 1 specification review.*

## Change Log
| Date | Change | Reason |
|---|---|---|
| 2026-09-15 | Initial baseline specification | Spec-Driven Development Playbook Phase 2 baseline. |
| 2026-09-15 | Phase 6 & 7 Spec Sync: Completed all EARS requirements (FR-1 through FR-15) and Tasks T11-T15 | Full implementation and validation sign-off. |
