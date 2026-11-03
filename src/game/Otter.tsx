'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS, MovementTunables } from './constants';
import { InputState } from './input';
import { otterTelemetry } from './telemetry';

interface OtterProps {
  inputRef: React.RefObject<InputState>;
  tunables: MovementTunables;
}

// Pre-allocated math helper outside useFrame to avoid any per-frame allocations
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export function Otter({ inputRef, tunables }: OtterProps) {
  // Local physics and transform refs (never stored in React state per Section 4)
  const posRef = useRef(new THREE.Vector3(0, GAME_CONSTANTS.WATER_SURFACE_Y, 0));
  const velRef = useRef(new THREE.Vector3(0, 0, 0));
  const headingRef = useRef(0); // Yaw in radians, 0 = facing +Z

  // Dash state timers
  const dashCooldownTimerRef = useRef(0);
  const dashBoostTimerRef = useRef(0);
  const prevSpacePressedRef = useRef(false);

  // Cosmetic visual feedback refs
  const currentRollRef = useRef(0);
  const bobPhaseRef = useRef(0);

  // Object3D container references
  const rootGroupRef = useRef<THREE.Group>(null);
  const visualGroupRef = useRef<THREE.Group>(null);

  // Camera tracking refs (Milestone 1 follow camera)
  const currentCamPos = useRef(new THREE.Vector3(0, 12, -16));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const tempDesiredCamPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    // 1. Clamp delta time according to Section 4 to prevent physics anomalies
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0) return;

    const input = inputRef.current;
    const v = velRef.current;
    const pos = posRef.current;

    // 2. Calculate current horizontal speed on X-Z plane
    const currentSpeed = Math.sqrt(v.x * v.x + v.z * v.z);

    // 3. Update Dash Timers
    if (dashCooldownTimerRef.current > 0) {
      dashCooldownTimerRef.current = Math.max(0, dashCooldownTimerRef.current - dt);
    }
    if (dashBoostTimerRef.current > 0) {
      dashBoostTimerRef.current = Math.max(0, dashBoostTimerRef.current - dt);
    }

    // 4. Steering (Section 6.2)
    // turnFactor = clamp(speed / 3, 0.35, 1)
    // TURN_RATE = 2.4 rad/s. Steering works slowly at a standstill.
    // Turn input: A / Left = -1 (steer left towards -X), D / Right = +1 (steer right towards +X)
    let turnInput = 0;
    if (input.right) turnInput += 1;
    if (input.left) turnInput -= 1;

    const turnFactor = clamp(
      currentSpeed / GAME_CONSTANTS.TURN_SPEED_REF,
      GAME_CONSTANTS.TURN_FACTOR_MIN,
      GAME_CONSTANTS.TURN_FACTOR_MAX
    );

    headingRef.current += turnInput * tunables.turnRate * dt * turnFactor;
    const h = headingRef.current;

    // 5. Unit vectors for heading (facing +Z at h=0)
    // Forward vector = (sin h, 0, cos h)
    // Right vector   = (cos h, 0, -sin h)
    const sinH = Math.sin(h);
    const cosH = Math.cos(h);
    const fwdX = sinH;
    const fwdZ = cosH;
    const rightX = cosH;
    const rightZ = -sinH;

    // 6. Dash Trigger (Space edge detection)
    const spaceIsPressed = input.dash;
    const dashJustPressed = spaceIsPressed && !prevSpacePressedRef.current;
    prevSpacePressedRef.current = spaceIsPressed;

    if (dashJustPressed && dashCooldownTimerRef.current <= 0) {
      dashCooldownTimerRef.current = tunables.dashCooldown;
      dashBoostTimerRef.current = tunables.dashDuration;

      // Add immediate impulse along forward vector
      v.x += fwdX * tunables.dashImpulse;
      v.z += fwdZ * tunables.dashImpulse;
    }

    const isDashBoostActive = dashBoostTimerRef.current > 0;

    // 7. Thrust Acceleration (W / ArrowUp)
    if (input.forward) {
      const thrustMultiplier = isDashBoostActive ? tunables.dashThrustMult : 1.0;
      const accelMagnitude = tunables.accel * thrustMultiplier * dt;
      v.x += fwdX * accelMagnitude;
      v.z += fwdZ * accelMagnitude;
    }

    // 8. Drag and Braking (S / ArrowDown applies extra drag without reversing)
    const effectiveDrag = tunables.drag + (input.backward ? tunables.brakeDrag : 0);
    const dragMultiplier = Math.exp(-effectiveDrag * dt);
    v.x *= dragMultiplier;
    v.z *= dragMultiplier;

    // 9. Lateral Grip / Water Drift (Section 6.2)
    // Decompose velocity into forward and sideways scalar components
    const vForward = v.x * fwdX + v.z * fwdZ;
    let vSide = v.x * rightX + v.z * rightZ;

    // Damping sideways slide over time
    vSide *= Math.exp(-tunables.lateralDamp * dt);

    // Recombine forward and damped sideways components
    v.x = vForward * fwdX + vSide * rightX;
    v.z = vForward * fwdZ + vSide * rightZ;

    // 10. Position update on X-Z plane
    pos.x += v.x * dt;
    pos.z += v.z * dt;

    // Optional restart key (R) resets otter to origin for testing
    if (input.restart) {
      pos.set(0, GAME_CONSTANTS.WATER_SURFACE_Y, 0);
      v.set(0, 0, 0);
      headingRef.current = 0;
      dashCooldownTimerRef.current = 0;
      dashBoostTimerRef.current = 0;
    }

    // 11. Visual Feedback (Cosmetic only, Section 6.2)
    // Bank roll: roll the mesh into turns (about 0.35 rad at full steer, smoothed)
    const targetRoll = -turnInput * GAME_CONSTANTS.ROLL_MAX;
    const rollBlend = 1 - Math.exp(-GAME_CONSTANTS.ROLL_DAMP * dt);
    currentRollRef.current += (targetRoll - currentRollRef.current) * rollBlend;

    // Swimming bob: small vertical bob that grows with speed
    const speedRatio = clamp(currentSpeed / (tunables.accel / tunables.drag), 0, 1.5);
    bobPhaseRef.current += dt * (GAME_CONSTANTS.BOB_FREQUENCY * Math.max(0.4, speedRatio));
    const bobOffsetY = Math.sin(bobPhaseRef.current) * GAME_CONSTANTS.BOB_AMPLITUDE * speedRatio;

    // Squash & Stretch on dash
    let scaleX = 1.0;
    let scaleY = 1.0;
    let scaleZ = 1.0;
    if (isDashBoostActive) {
      const dashProgress = dashBoostTimerRef.current / tunables.dashDuration;
      // Stretch along forward (Z), slightly compress width and height (X, Y)
      scaleZ = 1.0 + GAME_CONSTANTS.SQUASH_STRETCH_AMOUNT * dashProgress;
      scaleX = 1.0 - (GAME_CONSTANTS.SQUASH_STRETCH_AMOUNT * 0.5) * dashProgress;
      scaleY = scaleX;
    }

    // 12. Apply transforms to Three.js Object3D hierarchy
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(pos.x, GAME_CONSTANTS.WATER_SURFACE_Y, pos.z);
      rootGroupRef.current.rotation.y = headingRef.current;
    }

    if (visualGroupRef.current) {
      visualGroupRef.current.position.y = bobOffsetY;
      visualGroupRef.current.rotation.z = currentRollRef.current;
      visualGroupRef.current.scale.set(scaleX, scaleY, scaleZ);
    }

    // 13. Camera Follow (Milestone 1 tracking behind the otter along Z)
    tempDesiredCamPos.current.set(pos.x, pos.y + 11, pos.z - 15);
    const camBlend = 1 - Math.exp(-6 * dt);
    currentCamPos.current.lerp(tempDesiredCamPos.current, camBlend);
    currentLookAt.current.lerp(pos, camBlend);
    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentLookAt.current);

    // 14. Update Telemetry Store for live HUD without React re-renders
    otterTelemetry.speed = currentSpeed;
    const deg = ((h * (180 / Math.PI)) % 360 + 360) % 360;
    otterTelemetry.headingDeg = deg;
    otterTelemetry.dashCooldownRemaining = dashCooldownTimerRef.current;
    otterTelemetry.isDashing = isDashBoostActive;
    otterTelemetry.position[0] = pos.x;
    otterTelemetry.position[1] = pos.y;
    otterTelemetry.position[2] = pos.z;
  });

  return (
    <group ref={rootGroupRef}>
      {/* Visual group for roll banking, bobbing, and squash/stretch */}
      <group ref={visualGroupRef}>
        {/* Main otter body capsule (horizontal along Z axis) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
          <capsuleGeometry
            args={[
              GAME_CONSTANTS.OTTER_RADIUS,
              GAME_CONSTANTS.OTTER_LENGTH,
              12,
              24,
            ]}
          />
          <meshToonMaterial color="#8d5b34" />
        </mesh>

        {/* Inverted-hull dark outline (Section 8) */}
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.15, 0]}
          scale={[1.08, 1.08, 1.05]}
        >
          <capsuleGeometry
            args={[
              GAME_CONSTANTS.OTTER_RADIUS,
              GAME_CONSTANTS.OTTER_LENGTH,
              12,
              24,
            ]}
          />
          <meshBasicMaterial color="#3d2112" side={THREE.BackSide} />
        </mesh>

        {/* Lighter belly patch */}
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0.1]}
          scale={[0.8, 0.85, 0.4]}
        >
          <capsuleGeometry
            args={[
              GAME_CONSTANTS.OTTER_RADIUS,
              GAME_CONSTANTS.OTTER_LENGTH * 0.8,
              8,
              16,
            ]}
          />
          <meshToonMaterial color="#d8c5a4" />
        </mesh>

        {/* Cute snout at front (+Z) */}
        <mesh position={[0, 0.15, 0.85]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshToonMaterial color="#c2a47a" />
        </mesh>

        {/* Nose dot at front tip */}
        <mesh position={[0, 0.22, 1.02]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial color="#1a1410" />
        </mesh>

        {/* Eyes (left and right) */}
        <mesh position={[0.16, 0.32, 0.78]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        <mesh position={[-0.16, 0.32, 0.78]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshBasicMaterial color="#111111" />
        </mesh>

        {/* Left ear */}
        <mesh position={[0.26, 0.42, 0.4]} rotation={[0, 0, -0.3]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshToonMaterial color="#734524" />
        </mesh>

        {/* Right ear */}
        <mesh position={[-0.26, 0.42, 0.4]} rotation={[0, 0, 0.3]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshToonMaterial color="#734524" />
        </mesh>

        {/* Swimming tail at the rear (-Z) */}
        <mesh position={[0, 0.12, -0.9]} rotation={[-0.2, 0, 0]}>
          <coneGeometry args={[0.2, 0.65, 16]} />
          <meshToonMaterial color="#734524" />
        </mesh>
      </group>
    </group>
  );
}
