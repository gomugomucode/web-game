# Otter Run: Task History & Development Log

This document records all user task prompts, instructions, requirements, and the technical implementation work performed across the lifecycle of the **Otter Run** project.

---

## Task Index

1. [Task 1: Milestones 1–4 — Core Arcade Movement, Follow Camera, Procedural River & Race Loop](#task-1-milestones-14--core-arcade-movement-follow-camera-procedural-river--race-loop)
2. [Task 2: Milestones 5–7 — River Currents, Cel-Shaded Toon Shading & Dimstone Hazards](#task-2-milestones-57--river-currents-cel-shaded-toon-shading--dimstone-hazards)
3. [Task 3: Milestone 8 — AI Rivals, Path Following, Hazard Avoidance & Live Position HUD](#task-3-milestone-8--ai-rivals-path-following-hazard-avoidance--live-position-hud)
4. [Task 4: Milestone 9 — Geometry Merging, Instanced Rendering & F3 Dev Performance Overlay](#task-4-milestone-9--geometry-merging-instanced-rendering--f3-dev-performance-overlay)
5. [Task 5: Milestone 10 — Otter Haven Hub Vertical Slice & Elder Moss Proximity Dialogue](#task-5-milestone-10--otter-haven-hub-vertical-slice--elder-moss-proximity-dialogue)
6. [Task 6: Milestone 11 — Track Registry, Serpentine Rapids (Track 2) & Save System v1](#task-6-milestone-11--track-registry-serpentine-rapids-track-2--save-system-v1)
7. [Task 7: Milestone 12 — Freeze Pause Menu, Procedural Web Audio API Synthesizer & Settings](#task-7-milestone-12--freeze-pause-menu-procedural-web-audio-api-synthesizer--settings)
8. [Task 8: 3D Artist Brief Commission (docs/OTTER_MODEL_BRIEF.md)](#task-8-3d-artist-brief-commission-docsotter_model_briefmd)
9. [Task 9: Story Part 1 Implementation (story-part1)](#task-9-story-part-1-implementation-story-part1)
10. [Task 10: Story Part 1 Bug Fixes & Banner Refinements](#task-10-story-part-1-bug-fixes--banner-refinements)
11. [Task 11: Milestone 14 — Story Part 2 & The Wellspring Run (story-part2)](#task-11-milestone-14--story-part-2--the-wellspring-run-story-part2)
12. [Task 12: Milestone 15 — Genshin-Style Controls, Orbit Camera & Rebindable Keys (controls-genshin)](#task-12-milestone-15--genshin-style-controls-orbit-camera--rebindable-keys-controls-genshin)
13. [Task 13: Project Documentation, Comprehensive Changelog & Task History](#task-13-project-documentation-comprehensive-changelog--task-history)

---

## Task 1: Milestones 1–4 — Core Arcade Movement, Follow Camera, Procedural River & Race Loop

### Prompt & Requirements
- Build a 3D browser racing game prototype with Next.js 16, React 19, Three.js, `@react-three/fiber` (R3F), and `@react-three/drei`.
- Implement arcade watercraft movement: acceleration, hydrodynamic drag, water drift/lateral damping, speed-proportional turning, and a burst dash with cooldown.
- Implement a third-person chase camera (7 m behind, 3.5 m above) with $1 - e^{-6 \cdot dt}$ exponential smoothing, dash FOV boost (+10°), and water surface anti-clipping.
- Generate procedural 18 m river ribbon from Catmull-Rom centerline splines with raised 3D grassy banks and smooth collision sliding.
- Implement complete race state machine: countdown overlay (3-2-1-GO), checkpoint arches with highlight shader, decoupled high-frequency `mm:ss.mmm` timer, post-race finish results modal, `localStorage` best times, and instant restart (<kbd>R</kbd>).

### Work Completed
- **`src/game/Otter.tsx`**: Implemented otter capsule placeholder, arcade movement physics, drift lateral velocity damping, dash impulse timer, and cosmetic turn roll.
- **`src/game/CameraRig.tsx`**: Third-person follow camera with lookahead targeting and dynamic FOV expansion.
- **`src/game/River.tsx`**: Dynamic river mesh generator from Catmull-Rom splines, grassy banks, and checkpoint gates.
- **`src/game/CollisionBoundary.tsx`**: Bank boundary projection preventing the player from escaping the river corridor.
- **`src/ui/Hud.tsx`**: Decoupled DOM HUD with speedometer, heading compass, dash cooldown bar, and millisecond race timer.
- **`src/game/useGameStore.ts`**: Zustand store managing race lifecycle (`idle`, `countdown`, `racing`, `finished`).

---

## Task 2: Milestones 5–7 — River Currents, Cel-Shaded Toon Shading & Dimstone Hazards

### Prompt & Requirements
- Add **Currents**: smooth acceleration corridors along splines with 8 m fade-in/out transitions, white foam flow streaks, and water tint zones.
- Establish stylized **Cel-Shaded Visual Look**: 3-step toon ramp with `THREE.NearestFilter`, soft directional sunlight, ambient sky hemisphere light, and custom river water shader with downstream ripple distortion and foam fringes.
- Add **Hazards**: dark obsidian stone obstacles near currents requiring slalom maneuvers, proximity collision checks, camera impact jolt, and a 0.5x speed penalty.

### Work Completed
- **`src/game/Currents.tsx`**: Implemented current boost vector addition, animated foam streak particle matrix, and translucent turquoise current overlay.
- **`src/game/materials.ts`**: Created shared 3-step gradient map texture and custom water vertex/fragment shaders.
- **`src/game/Hazards.tsx`**: Added obstacle rock placement with glowing amber ground warning rings, 0.4s hit cooldown, and velocity damping penalty.
- **`src/game/constants.ts`**: Added tunables for current strength, hazard collision radius, and speed reduction factors.

---

## Task 3: Milestone 8 — AI Rivals, Path Following, Hazard Avoidance & Live Position HUD

### Prompt & Requirements
- Add 3 AI rival otters racing alongside the player:
  - **Pip** (`#38bdf8`, light blue, speed ratio 0.98, lane offset $+2.5\text{ m}$).
  - **Barnaby** (`#34d399`, emerald green, speed ratio 0.94, lane offset $-2.5\text{ m}$).
  - **Luna** (`#fb7185`, coral rose, speed ratio 1.02, lane offset $0.0\text{ m}$).
- Implement Catmull-Rom spline path following, hazard rock avoidance raycasts, current riding, and mutual soft separation.
- Implement live race position calculation ("X / 4") and final rank results screen.

### Work Completed
- **`src/game/Rivals.tsx`**: Implemented AI steering controller, spline projection, lateral avoidance steering vectors, and capsule rendering for rivals.
- **`src/game/telemetry.ts`**: Added real-time player rank tracking calculated from checkpoint progress and fractional distance.
- **`src/ui/Hud.tsx`**: Added decoupled live rank indicator ("1st", "2nd", "3rd", "4th") and final placement banner.

---

## Task 4: Milestone 9 — Geometry Merging, Instanced Rendering & F3 Dev Performance Overlay

### Prompt & Requirements
- Optimize renderer draw calls to remain strictly under 80 draw calls across all scenes.
- Merge static gate geometries (posts, crossbars, banners, lanterns).
- Add real-time performance dev monitor toggled via <kbd>F3</kbd> showing draw calls, triangle counts, and smoothed FPS.
- Ensure zero heap allocations inside `useFrame`.

### Work Completed
- **`src/game/River.tsx`**: Merged checkpoint gate arches, start banners, and finish arches into composite static geometries using `BufferGeometryUtils`.
- **`src/game/DevPerformanceMonitor.tsx`**: Built decoupled monitor capturing `gl.info.render.calls` and `gl.info.render.triangles`.
- **`src/ui/Hud.tsx`**: Added <kbd>F3</kbd> toggle listener and realtime stat display.
- **Verification**: Draw calls verified at 21 in hub, 40 on River 01, and 50 on River 02 (~150 FPS).

---

## Task 5: Milestone 10 — Otter Haven Hub Vertical Slice & Elder Moss Proximity Dialogue

### Prompt & Requirements
- Create a peaceful village hub scene: **Otter Haven** (60 m calm pond, animated water shader, 3 wooden docks, instanced shoreline boulders, marsh reeds).
- Add mentor NPC on the north dock with an animated floating quest diamond, 4 m proximity interact prompt (<kbd>E</kbd> / <kbd>F</kbd>), and branching dialogue.
- Introduce dual game mode state machine: `hub` and `race` modes with clean state isolation.
- Add "Return to Pond" action on race results panel.

### Work Completed
- **`src/game/HubScene.tsx`**: Created Otter Haven environment with merged docks, instanced perimeter rocks, and animated quest diamond.
- **`src/game/CollisionBoundary.tsx`**: Extended collision boundary system to support circular pond perimeter and central island obstacles.
- **`src/ui/DialogueOverlay.tsx`**: Built modal dialogue box with typewriter text, speaker badges, and keyboard/mouse choice navigation.
- **`src/game/useGameStore.ts`**: Added `mode: 'hub' | 'race'`, `openDialogue`, `closeDialogue`, and `returnToHub` actions.

---

## Task 6: Milestone 11 — Track Registry, Serpentine Rapids (Track 2) & Save System v1

### Prompt & Requirements
- Decouple track data from gameplay code via a central Track Registry with zero-allocation precomputed metadata.
- Create second track: **Serpentine Rapids (`river-02`)** (410 m winding S-curve canyon, 5 checkpoints, 3 currents, 8 hazard rocks).
- Rename mentor NPC to **Elder Moss** with a vibrant moss green scarf (`#84cc16`), keeping him visually distinct from rival Barnaby (`#059669`).
- Implement versioned `otter-run:save` schema in `localStorage` storing unlocked tracks, best times, and progression flags (`river02_unlocked`).
- Build modal **Track Select Overlay** with track previews, unlock requirements, and keyboard shortcuts (<kbd>1</kbd>, <kbd>2</kbd>).

### Work Completed
- **`src/game/tracks/registry.ts`**: Central registry caching bounding boxes, lengths, and checkpoint positions.
- **`src/game/tracks/river02.ts`**: Track definition for Serpentine Rapids.
- **`src/game/saveSystem.ts`**: Implemented `loadSaveData`, `writeSaveData`, and `saveTrackRecord` with legacy storage dual-writing.
- **`src/ui/TrackSelectOverlay.tsx`**: Built track selection modal with unlock badges and best lap time displays.

---

## Task 7: Milestone 12 — Freeze Pause Menu, Procedural Web Audio API Synthesizer & Settings

### Prompt & Requirements
- Implement global pause menu (<kbd>Esc</kbd>) that freezes physics, AI rivals, water shaders, current streaks, camera smoothing, and lap timer.
- Compensate paused time using `pauseOffset` accumulator so paused time is never counted toward race records.
- Automatically pause on window blur or tab visibility change during a race.
- Build procedural Web Audio API synthesizer with zero external audio assets (speed-modulated water ambience, gate chimes, countdown beeps, dash whoosh, collision thud, current shimmer, UI clicks).
- Add settings modal with volume sliders, mute toggle (<kbd>M</kbd>), and high/low graphics quality toggle.
- Migrate save schema to `version: 2` and harden production builds (gate Leva and F3 behind `?debug`).

### Work Completed
- **`src/ui/PauseOverlay.tsx`**: Full-screen backdrop pause menu with Resume, Restart, Return to Hub, and Settings buttons.
- **`src/game/audio/soundManager.ts`**: Procedural Web Audio synthesizer featuring custom noise generators, biquad filter sweeps, and volume control.
- **`src/ui/SettingsOverlay.tsx`**: Settings modal with audio sliders, mute toggle, and graphics quality selector.
- **`src/game/saveSystem.ts`**: Save schema upgraded to `version: 2` with backward-compatible settings migration.

---

## Task 8: 3D Artist Brief Commission (docs/OTTER_MODEL_BRIEF.md)

### Prompt & Requirements
- Author a comprehensive, production-ready 3D model brief for a 3D artist commission to replace the capsule placeholder with a stylized, cel-shaded, low-poly otter.
- Style: Stylized anime mascot aesthetic, rounded friendly proportions, watertight mesh with smooth normals suitable for inverted-hull outline rendering.
- Technical specs: glTF 2.0 binary (`.glb`) + `.blend`, 1 unit = 1 m, ~2.2 m nose-to-tail, under 4,000 triangles, single material with vertex colors / untextured palette.
- Skeleton & animations: single root bone, spine, head, tail, limbs; animations for `idle`, `swim`, `swim_fast`, `bump`, and `rest`.

### Work Completed
- **`docs/OTTER_MODEL_BRIEF.md`**: Authored detailed brief covering artistic vision, character proportions, color palette tokens, geometry rules, rigging specifications, animation decision matrix, and QA checklist.
- Committed to `main` as documentation reference for future asset artists.

---

## Task 9: Story Part 1 Implementation (story-part1)

### Prompt & Requirements
- Work on a new branch named `story-part1` created from `main`. Do not merge or push to `main` until confirmed.
- Implement Story & Dialogue Draft (Part 1):
  - Formalize lore: *"A stream no one rides forgets how to flow. Racing keeps the river alive."*
  - Name currents **Heartstreams** and hazard rocks **Dimstones**.
  - Author Elder Moss dialogue scenes A through E-temp in `src/game/dialogue/hub.ts`.
  - Add deterministic pre-race rival dialogue lines for Pip, Barnaby, and Luna on the ready screen.
  - Add mysterious **Wisp Whisper** dialogue sequence triggered after clearing Serpentine Rapids.
  - Keep all story text in dialogue data files without hardcoding into UI components.

### Work Completed
- **`src/game/dialogue/storyData.ts`**: Authored `RIVAL_READY_LINES`, `WISP_WHISPER_SEQUENCE`, `UNLOCK_BANNERS`, and helper resolver functions.
- **`src/game/dialogue/hub.ts`**: Structured `hubDialogueSequences` with conditional flag checking for Scenes A, B, C, D, and E-temp.
- **`src/ui/Hud.tsx`**: Integrated pre-race rival ready quote card into countdown overlay.
- **`src/game/useGameStore.ts`**: Updated race completion to trigger Wisp whisper dialogue on first top 3 finish of River 02.

---

## Task 10: Story Part 1 Bug Fixes & Banner Refinements

### Prompt & Requirements
- Address bug review on `story-part1`:
  1. In Part 1 no third track exists, so replace the unlock banner with `"More river lies upstream. Coming soon."`.
  2. Confirm rival ready lines stay deterministic across <kbd>R</kbd> restarts within the same visit.
  3. Ensure all changes are cleanly committed on `story-part1` and verify with git log.
  4. Provide manual test steps, assumptions, and known issues.

### Work Completed
- **`src/game/dialogue/storyData.ts`**: Added `UNLOCK_BANNERS.river03Part1` ("More river lies upstream. Coming soon.").
- **`src/game/useGameStore.ts`**: Updated `finish()` to display `river03Part1` banner instead of unlocking a non-existent track.
- Verified deterministic rival ready line indexing via visit-stable `runId` calculation.
- Committed to `story-part1` (subsequently merged to `main` via PR #1).

---

## Task 11: Milestone 14 — Story Part 2 & The Wellspring Run (story-part2)

### Prompt & Requirements
- Work on a new branch named `story-part2` created from `main`. Do not commit to `main`.
- Read Story Draft (Part 2) and implement:
  1. New track **`river03` (The Wellspring Run)**: 450–550 m centerline, wide sweeping curve, tight hairpin, straight final run, 6 checkpoints, 4 currents (strongest in last third), 12+ Dimstone rocks, 18 m width, and shared Catmull-Rom smoothing. Verify with a script that every point lies inside the river.
  2. Unlocking: available when `river03_unlocked` is true. Auto-migration for existing saves.
  3. Banner: replace coming-soon text with `"New river unlocked: The Wellspring Run"`.
  4. Story: replace Scene E-temp with full Scene E, add Scene F (Epilogue), `story_complete` flag, Elder Moss priority checking `story_complete` first, Wellspring rival lines, `wisp_awakening` sequence, and 4th place banner `"The Wellspring glows faintly. Swim once more."`.
  5. Finish look: add a glowing pool beneath the finish arch with zero dynamic draw calls.
  6. Measure with `?debug`: draw calls must remain strictly under 80 across all tracks.

### Work Completed
- **`src/game/tracks/river03.ts`**: Created The Wellspring Run (537 m centerline, 6 checkpoints, 4 currents with `c4` strength 10.0, 14 Dimstone hazard rocks, $\pm 4.5\text{ m}$ rival lanes).
- **`scratch/verify_river03_inside.mjs`**: Script verified that all checkpoints, currents, hazards, and rival corridors are strictly within the 18 m river boundary.
- **`src/game/River.tsx`**: Added `wellspringPoolGeo` emissive cyan ring disc to River 03 finish gate.
- **`src/game/dialogue/storyData.ts`**: Added River 03 rival lines, `WISP_AWAKENING_SEQUENCE`, and Wellspring banners.
- **`src/game/dialogue/hub.ts`**: Replaced Scene E-temp with 5-line Scene E, added Scene F (Epilogue), and prioritized `story_complete`.
- **`src/ui/TrackSelectOverlay.tsx`**: Added <kbd>3</kbd> hotkey and 3-column modal layout.
- **`src/game/saveSystem.ts`**: Added `story_complete` flag and backward-compatible auto-migration.
- **Performance Verification (`verify_milestone_14.mjs`)**:
  - Hub: 21 draw calls (150 FPS)
  - River 01: 40 draw calls (150 FPS)
  - River 02: 50 draw calls (149 FPS)
  - River 03: 55 draw calls (150 FPS)
- Committed to `story-part2` as commit `d7d905b`.

---

## Task 12: Milestone 15 — Genshin-Style Controls, Orbit Camera & Rebindable Keys (controls-genshin)

### Prompt & Requirements
- Work on a new branch named `controls-genshin` created from `main`. Do not commit to `main`.
- Check existing mouse camera commit `120e904` and report capabilities.
- Implement Milestone 15:
  1. Control mode setting: Camera-relative (new, default) and Classic (tank), persisted in save v3.
  2. Camera: mouse look with pointer lock (`requestPointerLock`), yaw/pitch orbit, pitch clamped above water ($y \ge 0.5\text{ m}$) and under max angle ($\approx 66^\circ$), mouse wheel zoom (4–12 m), middle-click or <kbd>C</kbd> recentering, sensitivity slider and Invert Y in settings.
  3. Camera assist: after 1.5 s without mouse input during a race, gently turn camera toward river tangent direction.
  4. Movement: <kbd>W</kbd>, <kbd>A</kbd>, <kbd>S</kbd>, <kbd>D</kbd> relative to camera horizontal forward. Otter turns toward desired heading at tunable rate with speed factor; thrust reduced when pointing $> 90^\circ$ away; <kbd>S</kbd> brakes without reversing.
  5. Default key bindings: Move W/A/S/D, Dash Left Shift (Space secondary), Interact F (E secondary), Pause Esc, Restart R, Mute M, Recenter C.
  6. Rebindable keys: tabbed key binding screen in settings, duplicate key conflict warning, reset to defaults.
  7. Pointer lock behavior: Esc opens pause, menus release lock, floating resumption banner, arrow key fallback.
  8. On-screen controls & ready screen dynamic guides.
  9. Strict TypeScript, zero per-frame allocations, verify draw calls & FPS unchanged.

### Work Completed
- **`src/game/constants.ts`**: Added tunables for `GENSHIN_TURN_RATE`, `CAMERA_ASSIST_IDLE_DELAY`, `CAMERA_ASSIST_STRENGTH`, `CAMERA_PITCH_MIN`, `CAMERA_PITCH_MAX`, and arrow key orbit speeds.
- **`src/game/sharedRefs.ts`**: Added `cameraYaw` and `isPointerLocked` references.
- **`src/game/saveSystem.ts`**: Upgraded save schema to `version: 3` with `ControlMode`, `KeyBindings`, and migration.
- **`src/game/input.ts`**: Refactored keyboard listener to read dynamically from settings, support secondary default keys, and provide arrow key camera orbit fallback.
- **`src/game/CameraRig.tsx`**: Pointer lock listener, delta accumulation outside frame loop, sensitivity & invert Y scaling, pitch clamping ($0.05$ to $1.15$ rad), wheel zoom (4–12 m), <kbd>C</kbd> recentering, and race camera assist.
- **`src/game/Otter.tsx`**: Implemented camera-relative movement math, desired heading rotation, $> 90^\circ$ thrust reduction, braking, and classic mode tank steering.
- **`src/ui/SettingsOverlay.tsx`**: Redesigned tabbed settings (Camera & Mode, Key Bindings, Audio & Graphics), key rebind listening state, duplicate warning notice, and reset to defaults.
- **`src/ui/Hud.tsx`**: Added floating cursor resumption banner, dynamic ready screen controls overview, and footer controls card.
- **Performance Verification (`verify_milestone_15.mjs`)**:
  - Hub: 21 draw calls (148 FPS)
  - Race: 35 draw calls (153 FPS)
  - 0 runtime console errors.
- Committed to `controls-genshin` as commit `353be1d`.

---

## Task 13: Project Documentation, Comprehensive Changelog & Task History

### Prompt & Requirements
- Update `README.md` to reflect the full current state of the game (Otter Run).
- Create a `CHANGELOG.md` file recording all changes across every milestone.
- Create a task log file (`TASKS.md`) recording all user prompts given and work completed across the project.

### Work Completed
- **`README.md`**: Fully rewritten with comprehensive documentation covering dual control schemes, 3D watercraft physics, all 3 river tracks + Otter Haven hub, AI rivals, lore, procedural Web Audio synthesizer, controls reference table, tech stack, performance rules, and getting started guide.
- **`CHANGELOG.md`**: Formatted according to Keep a Changelog standard, detailing all additions, optimizations, and fixes from Milestone 1 through Milestone 15.
- **`TASKS.md`**: Comprehensive task index and prompt-by-prompt technical record documenting requirements, architectural decisions, code changes, and verification metrics.

---

## Summary of Verification Commands

All changes across all milestones have been verified using the project's standard verification toolchain:

```bash
# 1. Track geometry & curvature check across all tracks
npm run verify:tracks

# 2. Type check
npx tsc --noEmit

# 3. Linter check
npm run lint

# 4. Production compilation
npm run build

# 5. Production server verification
npm run start

# 6. Automated headless browser verification suite
node scratch/verify_milestone_14.mjs
node scratch/verify_milestone_15.mjs
```

