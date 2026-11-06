'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { GAME_CONSTANTS, DEFAULT_MOVEMENT_TUNABLES, MovementTunables } from './constants';
import { useKeyboardInput } from './input';
import { Otter } from './Otter';
import { Rivals } from './Rivals';
import { River } from './River';
import { Currents } from './Currents';
import { Hazards } from './Hazards';
import { Environment } from './Environment';
import { CameraRig } from './CameraRig';
import { river01 } from './tracks/river01';
import { Hud } from '../ui/Hud';

export function Game() {
  // Global keyboard input listener ref
  const inputRef = useKeyboardInput();

  // Leva controls for live tuning of movement values
  const tunables = useControls('Movement Tunables', {
    accel: {
      value: DEFAULT_MOVEMENT_TUNABLES.accel,
      min: 1,
      max: 30,
      step: 0.5,
      label: 'Thrust Accel (m/s²)',
    },
    drag: {
      value: DEFAULT_MOVEMENT_TUNABLES.drag,
      min: 0.1,
      max: 3.0,
      step: 0.05,
      label: 'Water Drag',
    },
    brakeDrag: {
      value: DEFAULT_MOVEMENT_TUNABLES.brakeDrag,
      min: 0.5,
      max: 8.0,
      step: 0.1,
      label: 'Brake Extra Drag',
    },
    turnRate: {
      value: DEFAULT_MOVEMENT_TUNABLES.turnRate,
      min: 0.5,
      max: 5.0,
      step: 0.1,
      label: 'Turn Rate (rad/s)',
    },
    lateralDamp: {
      value: DEFAULT_MOVEMENT_TUNABLES.lateralDamp,
      min: 0.5,
      max: 15.0,
      step: 0.5,
      label: 'Lateral Grip Damp',
    },
    dashImpulse: {
      value: DEFAULT_MOVEMENT_TUNABLES.dashImpulse,
      min: 2,
      max: 25,
      step: 0.5,
      label: 'Dash Impulse',
    },
    dashCooldown: {
      value: DEFAULT_MOVEMENT_TUNABLES.dashCooldown,
      min: 0.5,
      max: 5.0,
      step: 0.1,
      label: 'Dash Cooldown (s)',
    },
    dashDuration: {
      value: DEFAULT_MOVEMENT_TUNABLES.dashDuration,
      min: 0.1,
      max: 1.5,
      step: 0.05,
      label: 'Dash Duration (s)',
    },
    dashThrustMult: {
      value: DEFAULT_MOVEMENT_TUNABLES.dashThrustMult,
      min: 1.0,
      max: 3.0,
      step: 0.1,
      label: 'Dash Thrust Mult',
    },
    currentStrength: {
      value: DEFAULT_MOVEMENT_TUNABLES.currentStrength,
      min: 0,
      max: 20,
      step: 0.5,
      label: 'Current Strength (m/s²)',
    },
  }) as MovementTunables;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-200">
      {/* Leva Live Tuning Panel in Development */}
      <Leva collapsed={false} oneLineLabels={false} />

      {/* High-performance Race HUD (Milestone 4) */}
      <Hud tunables={tunables} />

      {/* 3D Scene Canvas */}
      <Canvas
        dpr={GAME_CONSTANTS.CANVAS_DPR}
        camera={{
          position: [
            river01.start.pos[0],
            GAME_CONSTANTS.CAMERA_HEIGHT,
            river01.start.pos[1] - GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE,
          ],
          fov: GAME_CONSTANTS.CAMERA_BASE_FOV,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full block"
      >
        {/* Genshin-style Valley Environment: sky, soft fog, warm sunlight, rocks, floating petals */}
        <Environment />

        {/* River Track: procedural water ribbon, raised grass banks, start and finish gates */}
        <River track={river01} />

        {/* Milestone 5: River currents with lighter tinted ribbon strips and flow streaks */}
        <Currents track={river01} />

        {/* Milestone 7: Obstacle rocks near currents requiring weaving navigation */}
        <Hazards track={river01} />

        {/* Otter mesh, movement loop, and river bank boundary collision */}
        <Otter inputRef={inputRef} tunables={tunables} />

        {/* Milestone 8: 3 Rival otters racing along river01 with path following and hazard avoidance */}
        <Rivals />

        {/* Follow Camera with 1 - exp(-6 * dt) smoothing and dash FOV effect */}
        <CameraRig />
      </Canvas>
    </div>
  );
}

export default Game;
