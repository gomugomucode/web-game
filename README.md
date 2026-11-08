# 🦦 Otter Run

A high-performance, stylized 3D arcade river racing game built with **Next.js 16 (App Router)**, **React 19**, **Three.js**, **@react-three/fiber (R3F)**, **@react-three/drei**, **Tailwind CSS v4**, and **Zustand**.

Inspired by the bright, cel-shaded aesthetic of modern anime-style adventure games, **Otter Run** lets players steer a nimble otter down vibrant, winding waterways, ride living Heartstream currents, dodge ancient Dimstones, race against quirky AI rivals, explore a peaceful village hub, and awaken the dormant river spirit known as the Wisp.

---

## 🎮 Key Features

### 1. Dual Control Modes & Camera Systems
- **Camera-Relative Mode (Genshin-Style, Default)**:
  - Movement is relative to the camera's horizontal forward vector: <kbd>W</kbd> moves away from the camera, <kbd>A</kbd>/<kbd>D</kbd> strafe/curve horizontally, and <kbd>S</kbd> applies hydrodynamic brakes (no accidental reversing).
  - The otter smoothly turns toward the desired heading at a speed-scaled turn rate, with natural forward thrust reduction when turning over 90° from the current heading.
  - **Pointer Lock Mouse Look**: Click anywhere on the viewport to lock the cursor. Smooth 360° horizontal yaw and vertical pitch orbit. Vertical pitch is clamped above the water surface ($y \ge 0.5\text{ m}$) to prevent camera water clipping.
  - **Mouse Wheel Zoom**: Smoothly scales camera follow distance between 4 m and 12 m.
  - **Recenter Snap**: Middle mouse click or pressing <kbd>C</kbd> instantly centers the camera behind the otter's swim heading.
  - **Camera Assist**: After 1.5 seconds of no mouse movement during a race, the camera gently aligns itself with the river's forward curvature.
  - **Cursor Resumption Banner**: When menus close, a subtle floating hint prompts the player to click to resume camera lock.
  - **Arrow Key Fallback**: If pointer lock is refused or unavailable, arrow keys orbit the camera.
- **Classic Mode (Tank Steering)**:
  - Old-school watercraft steering where <kbd>W</kbd> drives thrust forward along the otter's nose, <kbd>A</kbd>/<kbd>D</kbd> steer the rudder left/right, and <kbd>S</kbd> brakes, accompanied by an auto-aligning chase camera.
- **Fully Rebindable Key Bindings**:
  - Interactive settings tab supporting remapping of all actions (Move Forward, Backward/Brake, Left, Right, Dash, Interact, Pause, Restart, Mute, Recenter).
  - Real-time duplicate binding conflict detection with warning alerts.
  - One-click **Reset to Defaults** button.

### 2. High-Fidelity Watercraft Physics
- **Arcade Acceleration & Hydrodynamic Drag**: Cruise target of ~14 m/s, tunable acceleration and quadratic drag.
- **Water Drift & Lateral Damping**: Drifts through turns with tunable grip ($1 - e^{-\text{driftDamp} \cdot dt}$).
- **Dash Impulse Boost**: Burst speed boost with dynamic cooldown bar and squash-and-stretch mesh deform.
- **Boundary Sliding**: Smooth collision response along river perimeter banks preventing getting stuck.

### 3. Scenic River Tracks & Village Hub
1. **Otter Haven (Hub Pond)**:
   - 60 m calm pond featuring animated shader water, 3 wooden docks, instanced shoreline boulders, marsh reeds, and circular island collision boundaries.
   - Home to mentor NPC **Elder Moss**, featuring an animated floating quest marker and proximity-based interaction.
2. **Track 1: Calm Bend (`river-01`)**:
   - 320 m gentle river course, 4 checkpoints, 3 Heartstream currents, and 4 Dimstone hazard rocks. Ideal introductory course.
3. **Track 2: Serpentine Rapids (`river-02`)**:
   - 410 m winding S-curve canyon course, 5 checkpoints, 3 currents, and 8 Dimstone hazard rocks requiring slalom maneuvers. Unlocked by finishing Calm Bend in the top 3.
4. **Track 3: The Wellspring Run (`river-03`)**:
   - 537 m epic championship course featuring a wide sweeping curve, a tight hairpin, and a straight final sprint to the finish.
   - 6 checkpoints, 4 currents (including a 10.0 strength booster in the final third), 14 Dimstone hazard rocks, and a radiant glowing pool beneath the finish arch. Unlocked by placing top 3 in Serpentine Rapids.

### 4. Living World Elements: Heartstreams & Dimstones
- **Heartstreams (Currents)**: Pale, luminous ribbons of flowing water that accelerate swimmers along smoothed Catmull-Rom splines, rendered with animated flow streaks and water tint zones.
- **Dimstones (Hazard Rocks)**: Dark obsidian obstacles surrounded by amber warning rings that gather where water slows. Colliding triggers an acoustic thud, camera shake, and a temporary 0.5x speed penalty.

### 5. AI Rival Otters
- Three distinct rivals compete alongside the player in every race:
  - **Pip** (`#38bdf8`, light blue): Agile, eager, rides currents aggressively.
  - **Barnaby** (`#34d399`, emerald green): Calm, steady lines, disciplined pacing.
  - **Luna** (`#fb7185`, coral rose): Fiercely competitive, skilled lane navigator.
- AI features individual path follow logic, variable speed offsets (92%–102% of cruise), dynamic obstacle avoidance raycasts, current lane riding, soft separation, and pre-race ready dialogue lines.

### 6. Narrative & Story Progression
- **Story Integration**: "A stream no one rides forgets how to flow. Racing keeps the river alive."
- **Elder Moss Dialogue Sequences**:
  - **Scene A**: Welcoming arrival and introduction to the Haven.
  - **Scene B**: Explanation of the Heartstreams and Dimstones.
  - **Scene C**: Congratulations after completing the first race.
  - **Scene D**: Guidance upon unlocking Serpentine Rapids.
  - **Scene E**: Lore of the Wellspring and its sleeping spirit, the Wisp.
  - **Scene F (Epilogue)**: Celebration of the awakened river after conquering the Wellspring.
- **Wisp Encounters**:
  - **Wisp Whisper**: Mysterious chime and voice after clearing Serpentine Rapids.
  - **Wisp Awakening**: Cinematic 5-line story climax upon winning The Wellspring Run, accompanied by a pulsing celestial cyan speaker badge.

### 7. 100% Procedural Web Audio API Sound System
- Zero external audio files or dependencies; synthesized entirely at runtime via Web Audio API oscillators, noise buffers, and biquad filters:
  - Continuous, speed-modulated water rushing noise and hull spray.
  - Harmonic checkpoint chimes and 3-2-1-GO race countdown chords.
  - Resonant dash whoosh and visceral rock collision impact thuds.
  - Heartstream entry shimmers and finish fanfare flourishes.
  - Retro dialogue speech blips and UI button clicks.
  - Master, SFX, and Mute controls persisted in save data.

### 8. Robust Save & Progression System
- Versioned `localStorage` schema (`otter-run:save` v3) supporting:
  - Best lap times recorded per track (`mm:ss.mmm`).
  - Unlocked track IDs and story progression flags.
  - Control mode preferences, mouse sensitivity, invert Y, and camera assist settings.
  - Custom key bindings with backward-compatible auto-migration from v1/v2 saves.

---

## ⌨️ Controls Reference

### Default Controls (Camera-Relative Mode)

| Action | Primary Key | Secondary / Mouse | Notes |
|---|---|---|---|
| **Move Forward** | <kbd>W</kbd> | <kbd>↑</kbd> | Moves away from camera direction |
| **Move Left / Strafe** | <kbd>A</kbd> | <kbd>←</kbd> | Curves/strafes horizontally left |
| **Move Right / Strafe** | <kbd>D</kbd> | <kbd>→</kbd> | Curves/strafes horizontally right |
| **Brake / Backward** | <kbd>S</kbd> | <kbd>↓</kbd> | Hydrodynamic water brake (no reverse) |
| **Camera Orbit (Look)** | Mouse Move | Arrow Keys (fallback) | Click canvas to engage pointer lock |
| **Camera Zoom** | Scroll Wheel | — | Zooms follow distance (4 m – 12 m) |
| **Recenter Camera** | <kbd>C</kbd> | Middle Mouse Click | Snaps camera directly behind otter |
| **Dash (Boost)** | <kbd>Left Shift</kbd> | <kbd>Space</kbd> | Speed burst with cooldown |
| **Interact / Advance** | <kbd>F</kbd> | <kbd>E</kbd> | Talk to Elder Moss or advance dialogue |
| **Pause Game** | <kbd>Esc</kbd> | — | Pauses game, unlocks cursor, opens menu |
| **Restart Race** | <kbd>R</kbd> | — | Restarts race from start line |
| **Toggle Mute** | <kbd>M</kbd> | — | Toggles audio sound master mute |
| **Dev Stats HUD** | <kbd>F3</kbd> | — | Toggles realtime FPS, draw calls, triangles |

*(All keyboard bindings can be freely remapped in **Settings → Key Bindings**.)*

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [Next.js 16.4.4](https://nextjs.org/) (Turbopack, App Router, Server/Client split)
- **Runtime & UI**: [React 19.3.0](https://react.dev/)
- **3D Graphics Engine**: [Three.js 0.187.0](https://threejs.org/)
- **React 3D Integrations**: [@react-three/fiber 9.8.2](https://github.com/pmndrs/react-three-fiber) & [@react-three/drei 10.7.9](https://github.com/pmndrs/drei)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand 5.0.16](https://github.com/pmndrs/zustand)
- **Audio Engine**: Native HTML5 Web Audio API (zero audio file downloads)
- **Live Tuning**: [Leva 0.10.1](https://github.com/pmndrs/leva) (gated to development or `?debug`)
- **Type Checking**: TypeScript 5.8 with strict type checking (zero `any` types)

### Performance Engineering Principles
1. **Zero Allocations in Game Loop**: All math scratch vectors, quaternions, matrices, Euler angles, and colors are allocated once at module or component initialization. No heap allocations occur inside `useFrame`.
2. **Geometry Batching & Merging**: Checkpoint arches, start gates, finish arches, lanterns, and wooden docks are merged into static composite buffer geometries via `three-subdivide`/`BufferGeometryUtils`, dramatically cutting draw calls.
3. **Instanced Rendering**: Shoreline boulders, riverbed stones, and vegetation use `THREE.InstancedMesh` with singular draw calls.
4. **Draw Call Budget Under 80**:
   - **Hub**: ~21 draw calls (150+ FPS)
   - **Track 1**: ~40 draw calls (150+ FPS)
   - **Track 2**: ~50 draw calls (150+ FPS)
   - **Track 3**: ~55 draw calls (150+ FPS)
5. **Decoupled Telemetry**: High-frequency physics and telemetry (speed, heading, dash timer, position) write to mutable refs and are updated via direct DOM element mutation, completely bypassing React re-rendering.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (Node 22+ recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/gomugomucode/web-game.git
cd web-game

# Install dependencies
npm install
```

### Development Mode

```bash
# Start Turbopack dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To enable the developer tuning controls and performance monitor in the browser, append `?debug` to the URL:
```
http://localhost:3000/?debug
```

### Production Build & Run

```bash
# Compile optimized production build
npm run build

# Start production server
npm run start
```

### Code Quality Verification

```bash
# TypeScript strict type checking
npx tsc --noEmit

# ESLint validation
npm run lint
```

---

## 📂 Project Structure

```
├── docs/
│   └── OTTER_MODEL_BRIEF.md         # 3D artist brief for stylized rigged otter character
├── public/                          # Static assets and icons
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Main client page mounting Canvas and HUD
│   ├── game/
│   │   ├── audio/
│   │   │   └── soundManager.ts      # Procedural Web Audio API sound synthesizer
│   │   ├── dialogue/
│   │   │   ├── hub.ts               # Elder Moss story scenes A through F & logic
│   │   │   └── storyData.ts         # Pre-race rival lines, Wisp sequences & banners
│   │   ├── tracks/
│   │   │   ├── registry.ts          # Central track registry and precomputed cache
│   │   │   ├── river01.ts           # Track 1: Calm Bend data
│   │   │   ├── river02.ts           # Track 2: Serpentine Rapids data
│   │   │   └── river03.ts           # Track 3: The Wellspring Run data
│   │   ├── CameraRig.tsx            # Mouse look, pointer lock, camera assist & orbit
│   │   ├── CollisionBoundary.tsx    # River bank & pond island boundary physics
│   │   ├── constants.ts             # Central physics, camera & visual tunables
│   │   ├── Currents.tsx             # Heartstream splines, flow streaks & water tint
│   │   ├── DevPerformanceMonitor.tsx# F3 realtime renderer stats overlay
│   │   ├── Game.tsx                 # R3F Canvas root and scene orchestrator
│   │   ├── Hazards.tsx              # Dimstone rocks & collision feedback
│   │   ├── HubScene.tsx             # Otter Haven village hub 3D environment
│   │   ├── input.ts                 # Keyboard listener with rebindable bindings
│   │   ├── materials.ts             # 3-step toon ramp, water shaders & materials
│   │   ├── Otter.tsx                # Otter mesh, arcade physics & camera-relative steering
│   │   ├── River.tsx                # Procedural river mesh, banks & checkpoint gates
│   │   ├── Rivals.tsx               # AI rival otters, steering & obstacle avoidance
│   │   ├── saveSystem.ts            # LocalStorage persistence & v1/v2/v3 migration
│   │   ├── sharedRefs.ts            # Cross-component mutable refs (zero garbage)
│   │   ├── telemetry.ts             # Live mutable physics telemetry store
│   │   └── useGameStore.ts          # Zustand store (modes, phases, progress, settings)
│   └── ui/
│       ├── DialogueOverlay.tsx      # Elder Moss and Wisp dialogue UI
│       ├── Hud.tsx                  # Countdown, speed, position, timer & control cards
│       ├── PauseOverlay.tsx         # Freeze pause menu (<kbd>Esc</kbd>)
│       ├── SettingsOverlay.tsx      # Tabbed settings: Camera, Key Bindings, Audio
│       └── TrackSelectOverlay.tsx   # Track selector modal with unlock hints
├── CHANGELOG.md                     # Comprehensive version history & milestone records
├── HANDOVER.md                      # Architecture deep-dive and milestone handovers
├── TASKS.md                         # Detailed record of all user prompts and work done
└── README.md                        # Project overview and reference guide
```

---

## 📜 License & Credits

Developed with ❤️ as part of the **Otter Run** project. All procedural code, shaders, audio synthesis, and track data are open-source under the MIT License.
