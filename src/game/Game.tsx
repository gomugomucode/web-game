'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { GAME_CONSTANTS, DEFAULT_MOVEMENT_TUNABLES, MovementTunables } from './constants';
import { useKeyboardInput } from './input';
import { Otter } from './Otter';
import { Rivals } from './Rivals';
import { River } from './River';
import { DevPerformanceMonitor } from './DevPerformanceMonitor';
import { Currents } from './Currents';
import { Hazards } from './Hazards';
import { Environment } from './Environment';
import { CameraRig } from './CameraRig';
import { HubScene } from './HubScene';
import { getTrack } from './tracks/registry';
import { useGameStore } from './useGameStore';
import { Hud } from '../ui/Hud';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { TrackSelectOverlay } from '../ui/TrackSelectOverlay';
import { PauseOverlay } from '../ui/PauseOverlay';
import { SettingsOverlay } from '../ui/SettingsOverlay';
import { TouchNotice } from '../ui/TouchNotice';

export function Game() {
  // Global keyboard input listener ref
  const inputRef = useKeyboardInput();
  const mode = useGameStore((state) => state.mode);
  const activeTrackId = useGameStore((state) => state.activeTrackId);
  const settings = useGameStore((state) => state.settings);
  const activeTrack = getTrack(activeTrackId);

  // Milestone 12: Production hardening - hide Leva unless in development or ?debug is present
  const isDebugMode =
    process.env.NODE_ENV !== 'production' ||
    (typeof window !== 'undefined' && window.location.search.includes('debug'));

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
      {/* Leva Live Tuning Panel in Development (hidden in production unless ?debug) */}
      <Leva hidden={!isDebugMode} collapsed={false} oneLineLabels={false} />

      {/* High-performance Race & Hub HUD */}
      <Hud tunables={tunables} />

      {/* Pause Menu Overlay (Milestone 12) */}
      <PauseOverlay />

      {/* Audio & Graphics Settings Overlay (Milestone 12) */}
      <SettingsOverlay />

      {/* Dialogue Overlay (Milestone 10 & 11) */}
      <DialogueOverlay />

      {/* Track Select Overlay (Milestone 11) */}
      <TrackSelectOverlay />

      {/* Friendly Touch-Device Keyboard Notice (Milestone 12) */}
      <TouchNotice />

      {/* 3D Scene Canvas */}
      <Canvas
        dpr={settings.graphicsQuality === 'low' ? [1, 1] : GAME_CONSTANTS.CANVAS_DPR}
        camera={{
          position: [
            GAME_CONSTANTS.HUB_SPAWN_POS[0],
            GAME_CONSTANTS.CAMERA_HEIGHT,
            GAME_CONSTANTS.HUB_SPAWN_POS[1] - GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE,
          ],
          fov: GAME_CONSTANTS.CAMERA_BASE_FOV,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
        className="w-full h-full block"
      >
        {/* Genshin-style Valley Environment: sky, soft fog, warm sunlight, ground terrain, petals */}
        <Environment mode={mode} />

        {/* Milestone 10: Hub Scene (pond, docks, scenery rocks, reeds, NPC Elder Moss) */}
        {mode === 'hub' && <HubScene />}

        {/* Race Track, Currents, Hazards, and Rivals (Active in Race mode only) */}
        {mode === 'race' && (
          <>
            <River track={activeTrack} />
            <Currents track={activeTrack} />
            <Hazards track={activeTrack} />
            <Rivals track={activeTrack} />
          </>
        )}

        {/* Otter player model, physics and boundary collision */}
        <Otter inputRef={inputRef} tunables={tunables} track={activeTrack} />

        {/* Milestone 9: Real-time renderer performance monitor (gl.info.render) */}
        <DevPerformanceMonitor />

        {/* Follow Camera with 1 - exp(-6 * dt) smoothing and dash FOV effect */}
        <CameraRig />
      </Canvas>
    </div>
  );
}

export default Game;
