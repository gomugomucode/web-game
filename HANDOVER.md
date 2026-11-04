# Otter Run: Project Handover & Progress Document

> **Developer Context**: Solo project built with Next.js 16 (App Router), React 19, Three.js, `@react-three/fiber` v9, `@react-three/drei`, Tailwind CSS v4, Zustand, and Leva.
> **Repository**: [https://github.com/gomugomucode/web-game.git](https://github.com/gomugomucode/web-game.git) (Branch: `main`)
> **Current Version**: Milestone 1, 2, and 3 Complete + Vision Document Aesthetic Upgrades.

---

## 1. Executive Summary

**Otter Run** is a stylized 3D arcade river racing browser game inspired by the aesthetic of Genshin Impact (bright saturated colors, soft toon lighting, clean silhouettes). The player controls an otter racing down a winding river valley.

### Completed Milestones
* [x] **Milestone 1**: Arcade Otter movement, water drift, dash impulse, live Leva tuning panel, high-performance HUD.
* [x] **Milestone 2**: Third-person follow camera with $1 - e^{-6 \cdot dt}$ smoothing, dynamic dash FOV widening (+10°), anti-water clipping.
* [x] **Milestone 3**: Data-driven track (`river01`), procedural river ribbon, 3D raised grassy banks, and boundary collision slide system.
* [x] **Milestone 4**: Complete Race Flow (Countdown overlay, 4 ordered Checkpoints with active highlights, `mm:ss.mmm` decoupled Timer, Finish Results Panel, `localStorage` Best Time persistence, input locking, and <kbd>R</kbd> restart).
* [x] **Vision Aesthetics**: Genshin-inspired river valley with warm directional sunlight, atmospheric sky fog, valley ground floor, low-poly rocks, floating leaves, start/finish gates, water wake, and anime speed streaks.

### Next Milestone
* [ ] **Milestone 5**: Currents (Signature mechanic: acceleration along polyline, visible flow streaks, tinted water zones).

---

## 2. Technical Stack & Versions

* **Framework**: Next.js 16.4.4 (App Router, Turbopack, React 19.3.0)
* **3D Engine**: Three.js `0.187.0`, `@react-three/fiber` `9.8.2`, `@react-three/drei` `10.7.9`
* **Styling**: Tailwind CSS `^4.0`
* **Live Tuning**: `leva` `^0.10.1`
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
1. **Zero Allocations in Game Loop**: No `new THREE.Vector3()`, objects, or arrays are created inside `useFrame`. All math scratch objects and result containers are pre-allocated once in refs.
2. **Delta Time Clamping**: `dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME)` ($\text{max } dt = 0.05\text{ s}$) prevents physics explosions during frame drops.
3. **Decoupled High-Frequency State**: High-frequency values (position, velocity, heading, dash timers) live in `src/game/sharedRefs.ts` and `src/game/telemetry.ts`. They **never** enter React state or Zustand, avoiding full-tree re-renders and adhering to React 19 compiler immutability rules.
4. **Decoupled HUD**: The HUD (`src/ui/Milestone1Hud.tsx`) updates via an independent `requestAnimationFrame` loop at $\approx 20\text{ Hz}$, mutating DOM `textContent` and `style.width` directly.

---

## 4. Systems Completed in Detail

### 4.1 Character (The Otter) — `src/game/Otter.tsx`
* **Mesh & Placeholder Model**:
  * Capsule body ($r = 0.35\text{ m}, l = 0.9\text{ m}$) aligned with $+Z$.
  * Dual-tone fur: brown toon body (`#8d5b34`), lighter belly patch (`#d8c5a4`).
  * Distinct front snout, nose tip (`#1a1410`), dual eyes, rounded ears, and rear tail.
  * Inverted-hull dark cartoon outline (`THREE.BackSide`, `#3d2112`, $1.08\times$ scale).
* **Arcade Movement Physics**:
  * **Thrust**: <kbd>W</kbd> or <kbd>↑</kbd> adds forward thrust acceleration (`ACCEL = 10.0 m/s²`).
  * **Water Drag**: $v \cdot e^{-\text{DRAG} \cdot dt}$ (`DRAG = 0.9`). Steady cruise speed settles at $\approx 11.1\text{ m/s}$.
  * **Braking**: <kbd>S</kbd> or <kbd>↓</kbd> applies extra drag (`BRAKE_DRAG = 2.5`), slowing smoothly without reversing.
  * **Turn Factor**: Steering rate scales with speed: $\text{turnFactor} = \text{clamp}(\text{speed} / 3.0, 0.35, 1.0)$.
  * **Lateral Grip / Water Drift**: Decomposes velocity into forward and sideways scalar components:
    $$\vec{v}_{\text{forward}} = (\vec{v} \cdot \vec{F})\vec{F}, \quad \vec{v}_{\text{side}} = (\vec{v} \cdot \vec{R})\vec{R}$$
    Sideways drift dampens exponentially: $v_{\text{side}} \cdot e^{-\text{LATERAL\_DAMP} \cdot dt}$ (`LATERAL_DAMP = 4.0`), giving responsive arcade water drift.
  * **Dash Impulse**: <kbd>Space</kbd> edge-triggered. Adds $+10\text{ m/s}$ along forward vector, multiplies thrust by $1.5\times$ for $0.5\text{ s}$, with a $2.5\text{ s}$ cooldown.
* **Visual Effects**:
  * Banking roll into turns (up to $0.35\text{ rad}$, smoothed with exponential filter).
  * Vertical swimming bob synced to speed ($f = 7\text{ Hz}, \text{amp} = 0.06\text{ m}$).
  * Mesh squash and stretch during dash bursts.
  * Trailing foam wake ring on the water surface ($y = 0.02$).
  * Anime dash streak lines behind the otter during dash.

### 4.2 Follow Camera Rig — `src/game/CameraRig.tsx`
* **Third-Person Tracking**:
  * Desired position: $7\text{ m}$ behind along heading, $3.5\text{ m}$ above water level.
  * Look-at target: $3\text{ m}$ ahead along heading at $y = 0.5\text{ m}$.
  * Smoothing: $1 - e^{-6 \cdot dt}$ exponential interpolation on both position and look-at target.
* **Anti-Clipping**: Strict elevation clamp guarantees $y \ge 0.5\text{ m}$, preventing the camera from dipping below water surface ($y = 0$).
* **Dynamic FOV**: $60^\circ$ at rest; eases up by $+10^\circ$ (to $70^\circ$) during dash; eases back to $60^\circ$ after dash.
* **Reset Snap**: Snaps instantly to target on load or <kbd>R</kbd> reset to eliminate camera fly-in sweeps.

### 4.3 River Track & Boundary Physics — `src/game/River.tsx` & `src/game/math.ts`
* **Track Specification (`river01.ts`)**:
  * Centerline polyline of 8 coordinates: `[[0,0],[0,60],[25,110],[70,140],[120,140],[150,100],[150,40],[120,0]]`.
  * River half-width: $9\text{ m}$. Start at `[0, 2]` facing heading `0`.
* **Procedural Meshes (`River.tsx`)**:
  * Smooth Catmull-Rom spline subdivision ($14\times$ points).
  * Double-layered water ribbon (`#22d3ee` / `#0891b2`).
  * Continuous 3D raised grassy banks with sloped earthen rock sides (`#57534e`) and vibrant grass tops (`#22c55e`, height $0.85\text{ m}$, width $4.5\text{ m}$).
  * Wooden Start Gate with red festive lanterns at `[0, 2]`.
  * Finish Gate at final checkpoint `[124, 5]`.
* **Boundary Collision (`math.ts` & `Otter.tsx`)**:
  * `findNearestPointOnPolyline`: High-speed zero-allocation projection.
  * When distance from centerline $> 9\text{ m} - 0.45\text{ m}$:
    1. Otter position is clamped to the bank edge.
    2. Outward velocity into the bank is canceled.
    3. Forward velocity is multiplied by $0.7\times$.
    * Result: The otter slides smoothly along the bank contours without sticking or leaving the river.

### 4.4 Stylized Valley Environment — `src/game/Environment.tsx`
* **Lighting**: Directional sunlight (`#fffbeb`, intensity 1.35) at $[60, 80, -40]$ + ambient sky/ground hemisphere light (`#e0f2fe` / `#15803d`).
* **Atmospheric Fog**: Soft distance fog (`#bae6fd`, near $80\text{ m}$, far $320\text{ m}$).
* **Valley Floor**: Continuous rolling green terrain (`#16a34a`) surrounding the river corridor.
* **River Rocks**: Low-poly dodecahedron rock formations strategically placed along straights and bends.
* **Floating Particles**: 40 instanced breeze leaves/petals drifting in the wind over the river.

### 4.5 Controls & UI — `src/game/input.ts` & `src/ui/Milestone1Hud.tsx`
* **Input Management**:
  * <kbd>W</kbd> / <kbd>↑</kbd>: Swim forward.
  * <kbd>S</kbd> / <kbd>↓</kbd>: Brake (slow down, no reverse).
  * <kbd>A</kbd> / <kbd>←</kbd>: Steer Left.
  * <kbd>D</kbd> / <kbd>→</kbd>: Steer Right.
  * <kbd>Space</kbd>: Dash impulse.
  * <kbd>R</kbd>: Reset position to start line (`[0, 2]`).
  * Automatically prevents browser scrolling for Space and arrow keys.
* **HUD Overlay**:
  * Live digital speedometer with cruise speed target reference.
  * Heading display in degrees.
  * Dash cooldown progress bar with "READY" and "BOOSTING!" states.
  * Key controls guide.
* **Leva Panel**: Live tuning of `accel`, `drag`, `brakeDrag`, `turnRate`, `lateralDamp`, `dashImpulse`, `dashCooldown`, `dashDuration`, and `dashThrustMult`.

---

## 5. File Structure Reference

```text
src/
├── app/
│   ├── globals.css         # Tailwind v4 import & full-screen canvas layout
│   ├── layout.tsx          # Root layout with Geist font and title metadata
│   └── page.tsx            # Next.js dynamic client import for <Game /> (ssr: false)
├── game/
│   ├── CameraRig.tsx       # Follow camera with smoothing, dynamic FOV, anti-clipping
│   ├── constants.ts        # Single source of truth for all tunable constants
│   ├── Environment.tsx     # Genshin-style valley, sky, fog, sunlight, rocks, floating petals
│   ├── Game.tsx            # R3F Canvas mount, lighting, Leva panel, composition
│   ├── input.ts            # Window keyboard listener ref with preventDefault & blur reset
│   ├── math.ts             # findNearestPointOnPolyline, Catmull-Rom smoothCenterline
│   ├── Otter.tsx           # Otter mesh, arcade physics loop, bank collision, visual feedback
│   ├── River.tsx           # Procedural river ribbon, 3D raised grass banks, start/finish gates
│   ├── sharedRefs.ts       # Shared physics refs (position, heading, isDashing, hasReset)
│   ├── telemetry.ts        # Decoupled high-frequency HUD telemetry store
│   ├── useGameStore.ts     # Zustand store skeleton (prepared for race flow)
│   └── tracks/
│       ├── river01.ts      # "Calm Bend" track data (centerline, width, start, checkpoints)
│       └── types.ts        # Track, Checkpoint, Current, and Vec2 TypeScript interfaces
└── ui/
    └── Milestone1Hud.tsx   # High-performance rAF telemetry HUD overlay
```

---

## 6. Prompt to Give the Next AI Agent

When continuing work with another AI assistant, paste this prompt:

```markdown
We are building Otter Run, a 3D browser racing game with Next.js 16 (React 19), Three.js, @react-three/fiber v9, Tailwind CSS, Zustand, and Leva.

GitHub Repository: https://github.com/gomugomucode/web-game.git (branch main)
Current State: Milestones 1, 2, and 3 are complete and verified. The otter drives with arcade movement, drifts in water, dashes with dynamic camera FOV, and races on the winding "Calm Bend" river track with grassy banks and collision sliding.

Please read the attached HANDOVER.md and build ONLY Milestone 4 (Race Flow):
1. Countdown phase (idle -> countdown 3, 2, 1, GO -> racing). Lock player input during countdown.
2. Checkpoints: Place 4 visible checkpoint gates/rings in the river along river01.checkpoints. Player must hit checkpoints in sequential order (within checkpoint radius).
3. Racing Timer: Displays formatted mm:ss.mmm in the HUD. Use an independent rAF loop without full React tree re-renders.
4. Finish line & Results: Crossing checkpoint 4 (the finish) ends the race. Show finish panel with total time and best time.
5. Best Time Persistence: Store best time in localStorage under otter-run:best:river-01 (wrap with try/catch).
6. Pressing R restarts the race countdown at any time.

Rules:
- Strict TypeScript, no `any`.
- Zero allocations in useFrame.
- All tunable constants in src/game/constants.ts.
- Verify with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
```

