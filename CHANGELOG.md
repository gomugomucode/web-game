# Changelog

All notable changes to the **Otter Run** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.15.0] - 2026-11-08 (Milestone 15: Genshin-Style Controls & Camera)

### Added
- **Genshin-Style Camera-Relative Movement Mode** (default):
  - <kbd>W</kbd>, <kbd>A</kbd>, <kbd>S</kbd>, <kbd>D</kbd> direction vectors are calculated relative to the camera's horizontal forward vector:
    $$\vec{d} = (\sin\theta_{\text{cam}}, \cos\theta_{\text{cam}}) \cdot W + (\cos\theta_{\text{cam}}, -\sin\theta_{\text{cam}}) \cdot A - (\cos\theta_{\text{cam}}, -\sin\theta_{\text{cam}}) \cdot D$$
  - Smooth turning toward desired heading at `GENSHIN_TURN_RATE` ($9.5\text{ rad/s}$) scaled by speed factor.
  - Forward thrust reduction when pointing $> 90^\circ$ away from desired heading, preventing instantaneous backward swimming.
  - Hydrodynamic braking on <kbd>S</kbd> without reverse gear.
  - Classic tank-style steering kept as an optional user setting with zero gameplay changes.
- **Pointer Lock Mouse Look & Camera Orbit**:
  - Viewport click requests pointer lock (`requestPointerLock`) with hidden cursor for full 360° mouse look.
  - Horizontal yaw orbit and vertical pitch orbit with zero per-frame memory allocation.
  - Pitch angle clamped between $0.05\text{ rad}$ and $1.15\text{ rad}$ ($\approx 66^\circ$), strictly preventing camera clipping beneath water ($y \ge 0.5\text{ m}$).
  - Mouse wheel zoom smoothly scales follow distance between 4 m and 12 m.
  - Pressing <kbd>C</kbd> or middle mouse click snaps camera directly behind the otter.
  - Arrow keys fallback enables manual camera orbit if pointer lock is refused or unsupported.
- **Camera Assist System**:
  - Automatically activates in race mode after 1.5 seconds without mouse input (`CAMERA_ASSIST_IDLE_DELAY`), gently nudging camera yaw toward the river's tangent direction at `CAMERA_ASSIST_STRENGTH`.
  - Tunable in `constants.ts` and toggleable in Settings.
- **Interactive Rebindable Key Bindings UI**:
  - Tabbed settings interface (**Camera & Mode**, **Key Bindings**, **Audio & Graphics**).
  - Key listening state (`PRESS ANY KEY...`) supporting keyboard rebinding.
  - Real-time duplicate binding conflict warning alert (`Key "..." is already bound to "..."`).
  - **Reset to Defaults** button restoring standard bindings.
  - New default bindings: Move <kbd>W</kbd>/<kbd>A</kbd>/<kbd>S</kbd>/<kbd>D</kbd>, Dash <kbd>Left Shift</kbd> (with <kbd>Space</kbd> as secondary default), Interact <kbd>F</kbd> (with <kbd>E</kbd> as secondary default), Recenter <kbd>C</kbd>.
- **Pointer Lock UX & Banners**:
  - Opening Pause, Dialogue, Track Select, or Settings safely releases pointer lock.
  - Floating prompt banner appears when cursor is unlocked (`Click screen to resume camera control`).
  - On-screen controls cards and ready screen overview dynamically adapt to show currently bound keys and active control mode.
- **Save System Migration v3**:
  - Upgraded schema to `version: 3` in `otter-run:save`, adding `controlMode`, `mouseSensitivity`, `invertY`, `cameraAssist`, and `keyBindings`.
  - Backward-compatible migration preserving all previous unlocks, best times, and flags.

---

## [0.14.0] - 2026-11-08 (Milestone 14: Story Part 2 & The Wellspring Run)

### Added
- **Third River Track: The Wellspring Run (`river-03`)**:
  - 537 m centerline distance, 18 m river width, with wide sweeping curve, tight hairpin turn, and straight sprint to the finish.
  - 6 ordered checkpoints, 4 Heartstream currents (strongest current `c4` with strength $10.0$ in the final third), and 14 Dimstone hazard rocks.
  - Geometry verified by `verify_river03_inside.mjs`: all points, currents, hazards, and rival lanes strictly contained inside river boundaries.
- **Progression & Track Unlocking**:
  - Unlocked upon finishing *Serpentine Rapids* (`river-02`) in top 3 (`rank <= 3`).
  - Shown as locked with helpful hint in track select modal if locked; available to race immediately with hotkey <kbd>3</kbd> once unlocked.
  - Automatic flag synchronization for existing saves with zero manual migration.
- **Story Scene E & Scene F (Epilogue)**:
  - Replaced temporary Scene E with full 5-line narrative explaining the ancient Wellspring and sleeping keeper spirit, the Wisp.
  - Added 2-line **Scene F (Epilogue)** with Elder Moss celebrating the revived river after conquering the Wellspring.
  - Dialogue sequence priority updated: `story_complete` checked first.
- **Wisp Awakening Story Climax**:
  - 5-line sequence (`wisp_awakening`) triggered upon first top 3 finish on `river-03`.
  - Features pulsating celestial cyan speaker badge with soft particle styling.
  - Returns cleanly to race results screen upon completion.
- **Banner Updates**:
  - Replaced coming-soon text with `"New river unlocked: The Wellspring Run"`.
  - Added banner for 4th place finish on river-03: `"The Wellspring glows faintly. Swim once more."`.
- **Sacred Finish Arch Glowing Pool**:
  - Added `wellspringPoolGeo` emissive cyan disc/ring beneath the final finish gate on `river-03` with zero dynamic draw call cost.
- **Track Verification Suite (`scripts/verify-tracks.mjs`)**:
  - Standalone verification script checking all registered tracks for river boundary compliance, checkpoint positions, current corridors, hazard clearances, and minimum radius of curvature ($R \ge 12.0\text{ m}$).
  - Added `npm run verify:tracks` script to `package.json`.
- **Performance Verification**:
  - Hub: 21 draw calls (150 FPS), River 01: 40 draw calls (150 FPS), River 02: 50 draw calls (149 FPS), River 03: 55 draw calls (150 FPS). All well below the 80 draw call budget.

---

## [0.13.0] - 2026-11-07 (Milestone 13: Story Part 1 & Dialogue System)

### Added
- **Narrative Lore Integration**:
  - Formalized story concept: *"A stream no one rides forgets how to flow. Racing keeps the river alive."*
  - River currents designated as **Heartstreams**; hazard stones designated as **Dimstones**.
- **Elder Moss Dialogue Scenes (A through E-temp)**:
  - Scene A: First arrival and greeting from mentor Elder Moss.
  - Scene B: Lore introduction to Heartstreams and Dimstones.
  - Scene C: Congratulatory remarks after completing the first race.
  - Scene D: Guidance upon unlocking Serpentine Rapids.
  - Scene E-temp: Placeholder dialogue pointing toward upstream mysteries.
- **Pre-Race Rival Dialogue Lines**:
  - Deterministic pre-race lines for Pip, Barnaby, and Luna displayed on the race ready screen.
- **Wisp Whisper Sequence**:
  - Eerie, evocative 3-line dialogue triggered upon first top 3 finish on *Serpentine Rapids*.
- **Temporary Upstream Banner**:
  - Displayed `"More river lies upstream. Coming soon."` before Part 2 release.

---

## [0.12.0] - 2026-11-07 (Milestone 12: Pause Menu, Audio & Production Hardening)

### Added
- **Global Pause System (<kbd>Esc</kbd>)**:
  - Full game state freeze affecting otter physics, AI rivals, river water shader, current streaks, camera smoothing, and timer.
  - Window blur (`blur`) and tab hiding (`visibilitychange`) trigger auto-pause during races.
  - `pauseOffset` accumulator ensures paused duration is never counted against race records.
  - Pausing cleanly disabled while modal dialogue or track select overlays are open.
- **Procedural Web Audio API Sound Synthesizer**:
  - 100% procedurally synthesized audio with zero external audio files.
  - Continuous speed-modulated water rushing noise and hull spray filters.
  - Harmonic gate chimes, 3-2-1-GO countdown beeps, dash whoosh, collision thuds, current shimmers, and retro dialogue blips.
  - Concurrency limiter and exponential parameter ramping with zero garbage collection overhead.
- **Settings Overlay**:
  - Sliders for Master Volume and SFX/Ambience.
  - Audio mute toggle (<kbd>M</kbd> key).
  - Graphics Quality toggle (High vs Low, clamping device pixel ratio to 1.0 on low).
- **Save System Migration v2**:
  - Migrated schema to `version: 2` storing `GameSettings`.
- **Production Hardening**:
  - Gated Leva and F3 performance monitor behind `?debug` URL parameter.
  - Added non-blocking mobile device touch alert banner.
  - Cleaned all debug `console.log` statements from source files.

---

## [0.11.0] - 2026-11-07 (Milestone 11: Second Track, Progression & Saves)

### Added
- **Track Registry Architecture (`src/game/tracks/registry.ts`)**:
  - Decoupled track definitions from rendering and physics code.
  - Precomputes track metadata (bounding boxes, total lengths, checkpoint distances) at load time.
- **Second Track: Serpentine Rapids (`river-02`)**:
  - 410 m canyon course with winding S-curves, 5 checkpoints, 3 currents, and 8 Dimstone hazard rocks.
- **Progression & Save System v1 (`src/game/saveSystem.ts`)**:
  - Versioned `otter-run:save` schema in `localStorage`.
  - Tracks `unlockedTracks`, `bestTimes`, and progression flags (`river02_unlocked`, `river02_done`).
  - Dual-writes best lap times to legacy storage keys for backward compatibility.
- **Track Select Overlay (`src/ui/TrackSelectOverlay.tsx`)**:
  - Modal overlay displaying track list, unlock conditions, personal best lap times, and hotkeys (<kbd>1</kbd>, <kbd>2</kbd>).
- **Mentor Renaming**:
  - Renamed mentor NPC to **Elder Moss** with vibrant moss green scarf (`#84cc16`) to visually distinguish him from rival Barnaby (`#059669`).

---

## [0.10.0] - 2026-11-06 (Milestone 10: Minimal Hub Slice & Dialogue)

### Added
- **Dual Game Mode Architecture**:
  - Clean separation between `hub` and `race` modes in Zustand store.
- **Otter Haven Village Hub Environment**:
  - 60 m circular calm pond with custom animated water shader, 3 merged wooden docks, instanced shoreline boulders, and marsh reeds.
  - Unified `CollisionBoundary` interface supporting both river ribbons and circular hub island boundaries.
- **Elder Moss NPC & Proximity Dialogue**:
  - 3D character mesh on the north dock with animated floating quest diamond.
  - 4-meter proximity detection displaying interactive talk prompt (<kbd>E</kbd> / <kbd>F</kbd>).
  - Data-driven dialogue box with speaker badge, progress counter, and choice branching.
  - Seamless transition from dialogue choice to track selection modal.
- **Results Navigation**:
  - Added **Return to Pond** button on the race finish results card.

---

## [0.9.0] - 2026-11-06 (Milestone 9: Performance Optimization & Dev Monitor)

### Added
- **Realtime Dev Performance Monitor (<kbd>F3</kbd>)**:
  - Reads `gl.info.render.calls`, `gl.info.render.triangles`, and 0.5s smoothed FPS directly from Three.js renderer.
  - Renders to decoupled DOM HUD with zero React re-renders.
- **Geometry Merging & Instanced Rendering**:
  - Merged checkpoint posts, crossbars, banners, and lanterns into single composite geometries using `BufferGeometryUtils`.
  - Merged start gate and finish arch assemblies.
  - Reduced draw calls from 120+ down to 21 in hub, 40 on river 01, and 50 on river 02.

---

## [0.8.0] - 2026-11-06 (Milestone 8: AI Rivals & Position Tracking)

### Added
- **Three Distinct AI Rival Otters**:
  - **Pip** (speed ratio 0.98, lane offset $+2.5\text{ m}$, light blue `#38bdf8`).
  - **Barnaby** (speed ratio 0.94, lane offset $-2.5\text{ m}$, emerald green `#34d399`).
  - **Luna** (speed ratio 1.02, lane offset $0.0\text{ m}$, coral rose `#fb7185`).
- **AI Navigation & Obstacle Avoidance**:
  - Catmull-Rom spline path following with lookahead targeting.
  - Hazard rock proximity raycasting with lateral evasion maneuvers.
  - Current riding behavior when within current influence zones.
  - Soft separation repulsion preventing rivals from clipping into each other.
- **Live Race Position HUD**:
  - Real-time rank calculation ("X / 4") based on checkpoint progress and distance along track.
  - Decoupled DOM rank indicator updating at 60 FPS without React re-rendering.
  - Final rank display on the post-race results panel.

---

## [0.7.0] - 2026-11-05 (Milestone 7: Dimstone Hazards & Slalom)

### Added
- **Dimstone Hazard Obstacles**:
  - Dark obsidian rock models with glowing amber warning ground rings positioned near currents.
  - Requires tactical slalom weaving to stay in fast current corridors.
- **Hazard Collision Physics & Feedback**:
  - Proximity collision detection with 0.4s cooldown window.
  - 0.5x speed reduction penalty with camera impact jolt and procedural thud sound.

---

## [0.6.0] - 2026-11-05 (Milestone 6: Cel-Shaded Visual Look & Water Shader)

### Added
- **Stylized Cel-Shaded Art Direction**:
  - Shared 3-step toon gradient map with `THREE.NearestFilter` applied via `meshToonMaterial`.
  - Soft directional sunlight and ambient hemisphere sky lighting.
- **Custom River Water Shader**:
  - Multi-octave downstream ripple flow deformation.
  - Foam streamlines along current trajectories and shoreline water fringes.
  - Distance fog fading softly into the sky horizon.

---

## [0.5.0] - 2026-11-04 (Milestone 5: River Currents & Flow Streaks)

### Added
- **Heartstream Currents**:
  - Acceleration corridors along smoothed spline curves with 8 m fade-in/out transitions.
  - Tunable `currentStrength` multiplier boosting otter velocity.
- **Visual Current Effects**:
  - Flowing white foam streaks rendered along current vector lines.
  - Translucent turquoise water tint highlighting active stream zones.

---

## [0.4.0] - 2026-11-04 (Milestone 4: Complete Race Flow & Lap Timer)

### Added
- **Race Progression State Machine**:
  - `idle` (ready screen) $\rightarrow$ `countdown` (3-2-1-GO) $\rightarrow$ `racing` $\rightarrow$ `finished`.
- **Checkpoint Gates**:
  - 3D wooden arches spanning the river with floating target rings.
  - Active gate highlighted in vibrant cyan; completed gates turn dark green.
- **High-Performance Lap Timer**:
  - `mm:ss.mmm` precision timer updated via `requestAnimationFrame` with zero React state overhead.
- **Results Modal & Best Times**:
  - Finish results card displaying final time, personal best comparison, and new record notifications.
  - Dual-writing best times to `localStorage`.
- **Instant Restart**:
  - Pressing <kbd>R</kbd> instantly resets the racer to the starting line without page reload.

---

## [0.3.0] - 2026-11-03 (Milestone 3: Procedural River & Boundary Sliding)

### Added
- **Procedural River Ribbon**:
  - Dynamic 18 m river ribbon generated from Catmull-Rom centerline splines.
  - Raised 3D grassy embankment geometry on left and right river edges.
- **Boundary Slide System**:
  - Point-to-segment distance checks clamping otter position within river banks.
  - Tangential velocity projection allowing smooth sliding along embankments without sticking.

---

## [0.2.0] - 2026-11-03 (Milestone 2: Third-Person Follow Camera)

### Added
- **Third-Person Follow Camera**:
  - Positioned 7 m behind and 3.5 m above the otter, targeting a forward lookahead point.
  - Exponential smoothing via $1 - e^{-6 \cdot dt}$ avoiding lagging or jarring snaps.
- **Dynamic Dash Field of View**:
  - Camera FOV expands from 60° to 70° during dash boost and smoothly eases back.
- **Strict Anti-Water Clipping**:
  - Camera elevation clamped above water plane ($y \ge 0.5\text{ m}$).

---

## [0.1.0] - 2026-11-03 (Milestone 1: Arcade Otter Movement & Physics)

### Added
- **Arcade Watercraft Physics**:
  - Directional acceleration, quadratic water drag, and cruise speed tuning (~14 m/s).
  - Water drift and lateral grip damping.
  - Speed-dependent turn rate scaling.
  - Burst dash impulse with cooldown bar.
- **Live Leva Tuning Panel**:
  - Real-time parameter tweaking for acceleration, drag, drift damping, and turn rates.
- **Decoupled Telemetry HUD**:
  - Real-time speedometer, heading compass, and dash cooldown indicator.
