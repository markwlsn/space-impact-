# Project Constitution: Space Impact Modernized

## Stack & Conventions
- **Language & Runtime:** TypeScript (strict mode enabled), Vite build system.
- **Rendering Engine:** HTML5 Canvas 2D with modern hardware-accelerated composite operations (`lighter`, neon glow paths, offscreen canvas double buffering, particle blend modes).
- **Target Resolution:** Virtual resolution of 960x540 (16:9 widescreen classic upscaled ratio) letterboxed with crisp CSS scaling onto any display.
- **Audio Engine:** Procedural Web Audio API sound synthesis (zero external WAV/MP3 files).
- **Asset Pipeline:** 100% Procedural rendering for ships, enemies, projectiles, stars, nebulas, and UI (zero missing 404 image assets).

## Game Loop & Timing Philosophy
- **Deterministic 60 FPS Target:** Fixed timestep physics update with delta-time accumulator, decoupled from rendering interpolation.
- **Decoupled Architecture:** Separation of concerns between:
  - Game Engine (State orchestration, game loop)
  - Input Handling (Buffered key states, gamepad poll)
  - Entity Management (Spatial queries, component state, lifecycle)
  - Rendering Pipeline (Glow/bloom passes, particle overlays, UI heads-up display)
  - Audio Engine (Synthesizer voices, polyphony clamping)

## Non-Negotiables
1. **Zero External Media Assets:** All visuals and audio MUST be generated dynamically through code (Canvas vector/pixel rasterization and Web Audio oscillators/noise nodes).
2. **Zero Runtime Exceptions:** Strict boundary checks for arrays, safe entity destruction pools, and nullable handling.
3. **No Code Without Specs:** All features must map directly to an EARS requirement in `requirements.md` and a task in `tasks.md`.
4. **Clean Builds:** Zero TypeScript compiler warnings/errors (`tsc --noEmit`), cleanly buildable with `npm run build`.
5. **No Scope Creep Mid-Task:** Any emergent design ideas must be recorded under "Discovered Work" in `tasks.md`.

## Style Guide
- **Folder Structure:**
  - `src/core/`: Engine, loop, input, timing.
  - `src/entities/`: Player, enemies, projectiles, pickups.
  - `src/graphics/`: Renderer, starfield, particles, procedural sprite generators.
  - `src/audio/`: Web Audio synthesizer, sound effects.
  - `src/ui/`: HUD, overlays, menus, high score display.
- **Naming Conventions:** PascalCase for Classes/Interfaces, camelCase for methods/variables, UPPER_SNAKE_CASE for constants.
