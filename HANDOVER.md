# Otter Run: Project Handover & Progress Document

> **Developer Context**: Solo project built with Next.js 16 (App Router), React 19, Three.js, `@react-three/fiber` v9, `@react-three/drei`, Tailwind CSS v4, Zustand, and Leva.
> **Repository**: [https://github.com/gomugomucode/web-game.git](https://github.com/gomugomucode/web-game.git) (Branch: `main`)
> **Current Version**: Milestones 1 through 12 Complete. Production Hardened.

---

## 1. Executive Summary

**Otter Run** is a stylized 3D arcade river racing browser game inspired by the aesthetic of Genshin Impact (bright saturated colors, soft toon lighting, clean silhouettes). The player controls an otter swimming down scenic waterways, racing against AI rival otters, exploring a peaceful hub pond, and unlocking new river tracks.

### Completed Milestones
* [x] **Milestone 1**: Arcade Otter movement, water drift, dash impulse, live Leva tuning panel, high-performance HUD.
* [x] **Milestone 2**: Third-person follow camera with $1 - e^{-6 \cdot dt}$ smoothing, dynamic dash FOV widening (+10°), anti-water clipping.
* [x] **Milestone 3**: Data-driven track (`river01`), procedural river ribbon, 3D raised grassy banks, and boundary collision slide system.
* [x] **Milestone 4**: Complete Race Flow (Countdown overlay, 4 ordered Checkpoints with active highlights, `mm:ss.mmm` decoupled Timer, Finish Results Panel, `localStorage` Best Time persistence, input locking, and <kbd>R</kbd> restart).
* [x] **Milestone 5**: Currents (Acceleration along smoothed polyline with 8m smooth fade-in/out, visible flow streaks, tinted water zones).
* [x] **Milestone 6**: Visual Look (Shared 3-step toon gradient map with NearestFilter, animated water shader with downstream ripples, foam streamlines, shoreline fringes, toon specular glint, and distance fog).
* [x] **Milestone 7**: Hazards (Obstacle rocks near currents requiring slalom weaving, 0.5x speed penalty, 0.4s cooldown, dark obsidian stone with amber warning rings).
* [x] **Milestone 8**: Rival Otters (3 AI rivals with individual colors and lanes, target speeds 92%-102% of cruise, hazard rock avoidance, current riding, soft separation, live HUD position indicator "X / 4", and final race position results).
* [x] **Milestone 9**: Performance & Measurement (Real-time renderer dev overlay toggled via <kbd>F3</kbd> showing `gl.info.render.calls`, `gl.info.render.triangles`, and 0.5s smoothed FPS with zero React tree re-renders; draw calls reduced to 21 in hub, 41 in river 01, and 51 in river 02—all safely below budget).
* [x] **Milestone 10**: Minimal Hub Slice & Dialogue System (Game modes: `hub` and `race` with clean state isolation; 60m calm pond hub scene with animated shader water, 3 merged wooden docks, instanced rocks, and marsh reeds; shared `CollisionBoundary` interface for both river and hub circular boundaries/obstacles; NPC Elder Moss on the pier with floating animated quest marker, 4m interact prompt, data-driven dialogue, keyboard/mouse choice navigation, seamless transition to race ready screen, and Return to Hub button on finish panel).
* [x] **Milestone 11**: Second Track, Progression and Saves:
  * **Elder Moss**: Mentor NPC renamed to Elder Moss with vibrant moss green scarf (`#84cc16`), keeping rival Barnaby (`#059669`) distinct.
  * **Track Registry (`src/game/tracks/registry.ts`)**: Decoupled `river01` from all gameplay code. Zero-allocation precomputed metadata cache (`getTrackMetadata`).
  * **Second Track (`river02` - Serpentine Rapids)**: S-curve canyon, 18m width, 5 checkpoints, 3 currents, 8 hazard rocks.
  * **Progression & Save System (`src/game/saveSystem.ts`)**: Versioned `otter-run:save` schema (`version: 1`, `unlockedTracks`, `bestTimes`, `flags`). Unlocks `river02` upon finishing `river01` in the top 3 (`rank <= 3`).
  * **Track Select Overlay (`src/ui/TrackSelectOverlay.tsx`)**: Modal overlay showing available and locked tracks, records, unlock conditions, and keyboard shortcuts.
* [x] **Milestone 12**: Pause Menu, Settings, Audio, and Production Hardening:
  * **Pause Menu (<kbd>Esc</kbd>)**: Freezes everything (otter physics, rivals, currents animation, water shader, and timer). Resume, restart race (race mode only), return to hub, and settings. Timer and countdown do not count paused time via `pauseOffset` compensation. Pausing disallowed during dialogue or track select.
  * **Audio & Settings Modal**: Master, Music, and SFX volume sliders, Mute toggle (<kbd>M</kbd> key), and High/Low Graphics Quality toggle (clamping DPR to 1 on low).
  * **Save Migration (`otter-run:save`)**: Upgraded schema to `version: 2` with backward-compatible migration preserving all previous records, unlocks, and progress flags.
  * **Procedural Web Audio API Synthesizer (`src/game/audio/soundManager.ts`)**: Zero external dependencies, zero sound files. Synthesizes continuous speed-modulated water noise ambience, countdown beeps (3, 2, 1) and GO chord, checkpoint gate chime, dash whoosh, rock hit thud, current shimmer, finish fanfare, UI click, and dialogue blip. Lazy initialization on first gesture, concurrency capped, and zero allocations on frame updates. Clean hook for future music.
  * **Production Hardening**: Leva tuning panel and <kbd>F3</kbd> dev overlay hidden in production builds (accessible with `?debug`). Friendly non-blocking banner for touch-only devices. Zero `console.log` statements in source files.

---

## 2. Technical Stack & Versions

* **Framework**: Next.js 16.4.4 (App Router, Turbopack, React 19.3.0)
* **3D Engine**: Three.js `0.187.0`, `@react-three/fiber` `9.8.2`, `@react-three/drei` `10.7.9`
* **Audio**: Native Web Audio API (Procedural synthesis, zero audio file assets, zero external libraries)
* **Styling**: Tailwind CSS `^4.0`
* **Live Tuning**: `leva` `^0.10.1` (Gated to development or `?debug`)
* **State Management**: `zustand` `^5.0.16`
* **Type Safety**: TypeScript strict mode enabled (Zero `any` types)

---

## 3. Core Architecture & Conventions

### Coordinates & Units
* **Units**: 1 world unit = 1 meter.
* **Axes**: Y is up. Water surface is at $y = 0$. Movement happens on the X-Z plane.
* **Heading**: Yaw angle $h$ in radians. Forward vector = $(\sin h, 0, \cos h)$. Heading `0` faces $+Z$.
* **Screen Alignment**: Looking towards $+Z$, screen-left is $+X$ and screen-right is $-X$.
  * <kbd>A</kbd> / <kbd>←</kbd> increases heading $h$ towards $+X$ (turns Left).
  * <kbd>D</kbd> / <kbd>→</kbd> decreases heading $h$ towards $-X$ (turns Right).

### Performance & Memory Rules
1. **Zero Allocations in Game Loop**: No `new THREE.Vector3()`, objects, or arrays are created inside `useFrame`. All math scratch objects, vectors, matrices, and quaternions are pre-allocated at module load or inside component refs.
2. **Audio Modulation**: Real-time water ambience audio parameter ramping uses `setTargetAtTime`, achieving zero garbage collection overhead.
3. **Decoupled Telemetry**: High-frequency values (speed, heading, draw calls, triangles, FPS) write directly to plain mutable telemetry objects, bypassing React state to maintain constant 60+ FPS.

---

## 4. Milestone 12 Implementation Details

### 4.1 Pause Menu & System Freeze
- **Keybinding**: <kbd>Esc</kbd> key toggles the pause menu from anywhere in race or hub mode.
- **Safety Gate**: Pausing is disabled while dialogue or track select modals are open, preserving their native <kbd>Esc</kbd> close behavior.
- **Freeze Implementation**:
  - `Otter.tsx`: Returns early from `useFrame` when `gameState.isPaused`, freezing physics, dash timers, and bobbing. Silences water ambience.
  - `Rivals.tsx`: Early return freezes AI rival lane following, speed updates, and bobbing.
  - `River.tsx`: Early return freezes water shader uniform `uTime.value`.
  - `Currents.tsx`: Early return freezes foam streak matrix updates.
  - `HubScene.tsx`: Early return freezes pond water shader and floating quest marker.
  - `CameraRig.tsx`: Early return freezes camera smoothing and lerping.
- **Auto-Pause (Fix Pass)**: Automatically opens the pause menu when the browser window loses focus (`blur`) or the tab becomes hidden (`visibilitychange` with `document.hidden`) during a race or countdown. Never auto-resumes upon focus return; paused duration is completely deducted from timer calculations.
- **Timer & Countdown Compensation**:
  - Store tracks `isPaused`, `pausedAt`, and `pauseOffset`.
  - While paused, elapsed race time and countdown are stationary:
    $$\text{elapsed} = \text{now} - \text{startTime} - \text{pauseOffset} - (\text{now} - \text{pausedAt})$$
  - Upon resumption, `pauseOffset` accumulates the paused duration, guaranteeing that paused time is never counted toward the race record.

### 4.2 Audio & Settings Modal
- **Access**: Accessible via the Pause Menu, or directly from the Hub header button.
- **Controls**:
  - **Master Volume**: Linear gain scaler on master audio bus (0% to 100%).
  - **SFX & Ambience Volume**: Controls effects bus and ambient water noise level.
  - **Music Volume**: Hidden from settings until music tracks exist, while keeping the stored `musicVolume` setting field in `otter-run:save`.
  - **Mute Toggle**: <kbd>M</kbd> key toggles audio mute at any time during gameplay.
  - **Graphics Quality**: High (standard DPR) vs Low (clamped DPR = 1.0 for high framerates on lower-spec hardware).

### 4.3 Version 2 Save Migration
- **Schema (`otter-run:save`)**:
  ```ts
  export interface GameSettings {
    masterVolume: number; // 0.0 - 1.0
    musicVolume: number;  // 0.0 - 1.0
    sfxVolume: number;    // 0.0 - 1.0
    muted: boolean;
    graphicsQuality: 'high' | 'low';
  }

  export interface SaveData {
    version: 2;
    unlockedTracks: string[];
    bestTimes: Record<string, number>;
    flags: {
      met_mentor: boolean;
      first_race_done: boolean;
      river02_unlocked: boolean;
    };
    settings: GameSettings;
  }
  ```
- **Migration**: Reads version 1 saves seamlessly, backfilling default settings while preserving best times, unlocked tracks, and flags. Dual-writes to legacy `otter-run:best:<trackId>` keys for backwards compatibility.

### 4.4 Web Audio API Synthesizer (`src/game/audio/soundManager.ts`)
- **Water Ambience**: Continuous 2-second looping pink/Brownian noise filtered through a `BiquadFilterNode` modulated by swimming speed and current entry.
- **Countdown Tones**: 620Hz sine wave for 3 and 2; 740Hz sine wave for 1; 880Hz / 1100Hz / 1320Hz tri-tone chord for GO.
- **Checkpoint Ring**: Harmonized dual-frequency ascending chime (G5 -> C6, D6 -> G6).
- **Dash Boost**: Filtered sweeping noise burst whoosh.
- **Hazard Thud**: Low-frequency resonant punch with pitch drop (140Hz -> 45Hz).
- **Current Shimmer**: High-frequency modulated glockenspiel bell.
- **Finish Fanfare**: 1st place celebratory multi-tone ascending arpeggio; soft resolved chord for 2nd through 4th.
- **UI & Dialogue**: Short, clean, non-intrusive blips.

### 4.5 Production Hardening
- **Leva Panel**: Hidden in production unless `?debug` query parameter is present.
- **F3 Dev Overlay**: Restricted in production builds unless `?debug` query parameter is present.
- **Touch-Device Detection**: Non-blocking banner informing touch-only users that a physical keyboard is required.
- **Lint & Cleanliness**: Zero `console.log` statements in source files, zero unused imports, zero `any` types.

---

## 5. Performance Measurements

All measurements captured using Chrome CDP with Three.js WebGL renderer hardware counters:

| Mode / Scene | Draw Calls | Triangles | Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Hub (Otter Haven)** | **21** | 7,318 | < 80 | **Passed** |
| **River 01 Race (Calm Bend)** | **41** | 28,256 | < 80 | **Passed** |
| **River 02 Race (Serpentine Rapids)** | **51** | 32,494 | < 80 | **Passed** |

---

## 6. Directory Structure

```text
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── game/
│   ├── audio/
│   │   └── soundManager.ts # Native Web Audio API procedural sound synthesizer
│   ├── boundaries.ts       # Shared CollisionBoundary interface (RiverBoundary, HubBoundary)
│   ├── CameraRig.tsx       # Follow camera with smoothing, dynamic FOV, anti-clipping
│   ├── constants.ts        # Tunable constants and configuration parameters
│   ├── Currents.tsx        # Merged current strips and instanced flow streaks
│   ├── DevPerformanceMonitor.tsx # Three.js in-canvas renderer performance monitor
│   ├── Environment.tsx     # Genshin-style valley environment, sky, fog, sunlight, petals
│   ├── Game.tsx            # Scene composition, Leva gating, DPR settings, modal mounting
│   ├── Hazards.tsx         # Instanced hazard rocks, surface warning rings, and beacons
│   ├── HubScene.tsx        # 60m pond, merged docks, reeds, instanced rocks, NPC Elder Moss
│   ├── input.ts            # Window keyboard listener with blur reset
│   ├── math.ts             # Polyline nearest point projection and Catmull-Rom smoothing
│   ├── Otter.tsx           # Otter capsule, arcade physics loop, sound triggers, boundary slide
│   ├── River.tsx           # River water ribbon, raised grassy banks, start/checkpoint arches
│   ├── Rivals.tsx          # 3 deterministic AI rivals with hazard avoidance and lane following
│   ├── saveSystem.ts       # Versioned save schema (v2), migration, and persistence
│   ├── sharedRefs.ts       # Zero-allocation physics refs (position, heading, isDashing)
│   ├── telemetry.ts        # Plain mutable telemetry object for HUD & dev stats
│   ├── toonGradient.ts     # Shared 3-step DataTexture toon gradient map
│   ├── useGameStore.ts     # Zustand store for mode, race phases, dialogue, pause, and settings
│   ├── WaterMaterial.ts    # Custom animated toon water shader material
│   ├── dialogue/
│   │   └── hub.ts          # Data-driven progress-based dialogue with Elder Moss
│   └── tracks/
│       ├── registry.ts     # Central track registry and precomputed track metadata cache
│       ├── river01.ts      # "Calm Bend" track data
│       ├── river02.ts      # "Serpentine Rapids" S-curve track data
│       └── types.ts        # Track, Checkpoint, Current, Hazard TypeScript interfaces
└── ui/
    ├── DialogueOverlay.tsx # Dialogue modal overlay with branch choice navigation
    ├── Hud.tsx             # Decoupled rAF HUD: timer, speed, checkpoints, rank, pause & settings buttons
    ├── PauseOverlay.tsx    # Pause menu modal (Resume, Restart Race, Settings, Return to Hub)
    ├── SettingsOverlay.tsx # Audio volume sliders, Mute toggle, and Graphics quality choice
    ├── TouchNotice.tsx     # Friendly banner for touch-only devices
    └── TrackSelectOverlay.tsx # Track selection modal with stats and unlock states
```

---

## 7. Verification Checklist

- [x] `npx tsc --noEmit` passed with 0 errors.
- [x] `npm run lint` passed with 0 errors.
- [x] `npm run build` compiled successfully in Next.js Turbopack.
- [x] All 12 automated verification steps passed via Chrome CDP testing.
- [x] Pause menu freezes all 6 game loop systems and accurately compensates timer.
- [x] Backward-compatible version 2 save migration verified.
- [x] Procedural Web Audio API synthesizer operates with zero external assets or dependencies.
