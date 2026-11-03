'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { GAME_CONSTANTS, DEFAULT_MOVEMENT_TUNABLES, MovementTunables } from './constants';
import { useKeyboardInput } from './input';
import { Otter } from './Otter';
import { CameraRig } from './CameraRig';
import { Milestone1Hud } from '../ui/Milestone1Hud';

/**
 * Flat water plane with subtle grid for motion and drift readability
 */
function FlatWater() {
  return (
    <group>
      {/* Base water surface plane at y = 0 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GAME_CONSTANTS.WATER_SURFACE_Y, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshToonMaterial color={GAME_CONSTANTS.WATER_COLOR} />
      </mesh>

      {/* Subtle water surface caustics grid so drift and speed are visually clear */}
      <gridHelper
        args={[1000, 250, '#38bdf8', '#0284c7']}
        position={[0, GAME_CONSTANTS.WATER_SURFACE_Y + 0.01, 0]}
      />
    </group>
  );
}

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
  }) as MovementTunables;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Leva Live Tuning Panel in Development */}
      <Leva collapsed={false} oneLineLabels={false} />

      {/* High-performance HUD */}
      <Milestone1Hud tunables={tunables} />

      {/* 3D Scene Canvas */}
      <Canvas
        dpr={GAME_CONSTANTS.CANVAS_DPR}
        camera={{
          position: [0, GAME_CONSTANTS.CAMERA_HEIGHT, -GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE],
          fov: GAME_CONSTANTS.CAMERA_BASE_FOV,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full block"
      >
        {/* Stylized lighting: hemisphere + directional sunlight (Section 8) */}
        <hemisphereLight
          color="#bae6fd"
          groundColor="#0369a1"
          intensity={0.9}
        />
        <directionalLight
          position={[30, 45, -25]}
          intensity={1.2}
          color="#fffbeb"
        />

        {/* Flat water plane */}
        <FlatWater />

        {/* Otter mesh and movement loop */}
        <Otter
          inputRef={inputRef}
          tunables={tunables}
        />

        {/* Milestone 2 Follow Camera with Smoothing and Dash FOV Effect */}
        <CameraRig />
      </Canvas>
    </div>
  );
}

export default Game;
