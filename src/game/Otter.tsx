'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS, MovementTunables } from './constants';
import { InputState } from './input';
import { otterTelemetry } from './telemetry';
import { sharedOtterRefs } from './sharedRefs';
import { findNearestPointOnPolyline } from './math';
import { getTrack } from './tracks/registry';
import { Track } from './tracks/types';
import { useGameStore } from './useGameStore';
import { threeStepGradientMap } from './toonGradient';
import { RiverBoundary, HubBoundary, HUB_OBSTACLES } from './boundaries';

interface OtterProps {
  inputRef: React.RefObject<InputState>;
  tunables: MovementTunables;
  track?: Track;
}

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Pre-allocated collision boundaries implementing the common CollisionBoundary interface (Milestone 10 & 11)
const initialActiveTrack = getTrack(useGameStore.getState().activeTrackId);
const riverBoundary = new RiverBoundary(
  initialActiveTrack.smoothedCenterline ?? initialActiveTrack.centerline,
  initialActiveTrack.halfWidth
);

const hubBoundary = new HubBoundary(
  GAME_CONSTANTS.HUB_POND_CENTER[0],
  GAME_CONSTANTS.HUB_POND_CENTER[1],
  GAME_CONSTANTS.HUB_POND_RADIUS,
  HUB_OBSTACLES
);

export function Otter({ inputRef, tunables, track }: OtterProps) {
  // Start otter at hub spawn position or track start position
  const initialMode = useGameStore.getState().mode;
  const currentInitialTrack = track || getTrack(useGameStore.getState().activeTrackId);
  const initialSpawn = initialMode === 'hub' ? GAME_CONSTANTS.HUB_SPAWN_POS : currentInitialTrack.start.pos;
  const initialHeading = initialMode === 'hub' ? GAME_CONSTANTS.HUB_SPAWN_HEADING : currentInitialTrack.start.heading;

  const posRef = useRef(
    new THREE.Vector3(
      initialSpawn[0],
      GAME_CONSTANTS.WATER_SURFACE_Y,
      initialSpawn[1]
    )
  );
  const velRef = useRef(new THREE.Vector3(0, 0, 0));
  const headingRef = useRef(initialHeading);

  // Dash state timers
  const dashCooldownTimerRef = useRef(0);
  const dashBoostTimerRef = useRef(0);
  const hazardCooldownTimerRef = useRef(0);
  const prevSpacePressedRef = useRef(false);

  // Cosmetic visual feedback refs
  const currentRollRef = useRef(0);
  const bobPhaseRef = useRef(0);
  const lastRunIdRef = useRef(useGameStore.getState().runId);
  const lastTrackIdRef = useRef(useGameStore.getState().activeTrackId);
  const prevRestartRef = useRef(false);

  // Object3D container references
  const rootGroupRef = useRef<THREE.Group>(null);
  const visualGroupRef = useRef<THREE.Group>(null);
  const wakeMeshRef = useRef<THREE.Mesh>(null);
  const dashStreaksRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // 1. Clamp dt according to Section 4
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0) return;

    const input = inputRef.current;
    const v = velRef.current;
    const pos = posRef.current;

    // Read current mode and race phase from store
    const gameState = useGameStore.getState();
    const mode = gameState.mode;
    const phase = gameState.phase;
    const currentTrack = track || getTrack(gameState.activeTrackId);

    // Update boundary when track changes
    if (gameState.activeTrackId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = gameState.activeTrackId;
      riverBoundary.setTrack(
        currentTrack.smoothedCenterline ?? currentTrack.centerline,
        currentTrack.halfWidth
      );
    }

    // Detect a runId change at the top of useFrame and reset to spawn (Milestone 10 & 11)
    if (gameState.runId !== lastRunIdRef.current) {
      lastRunIdRef.current = gameState.runId;
      const spawnPos = mode === 'hub' ? GAME_CONSTANTS.HUB_SPAWN_POS : currentTrack.start.pos;
      const spawnHeading = mode === 'hub' ? GAME_CONSTANTS.HUB_SPAWN_HEADING : currentTrack.start.heading;

      pos.set(
        spawnPos[0],
        GAME_CONSTANTS.WATER_SURFACE_Y,
        spawnPos[1]
      );
      v.set(0, 0, 0);
      headingRef.current = spawnHeading;
      dashCooldownTimerRef.current = 0;
      dashBoostTimerRef.current = 0;
      hazardCooldownTimerRef.current = 0;
      prevSpacePressedRef.current = false;
      currentRollRef.current = 0;
      bobPhaseRef.current = 0;

      if (rootGroupRef.current) {
        rootGroupRef.current.position.set(
          spawnPos[0],
          GAME_CONSTANTS.WATER_SURFACE_Y,
          spawnPos[1]
        );
        rootGroupRef.current.rotation.y = spawnHeading;
      }

      if (visualGroupRef.current) {
        visualGroupRef.current.position.set(0, 0, 0);
        visualGroupRef.current.rotation.set(0, 0, 0);
        visualGroupRef.current.scale.set(1, 1, 1);
      }

      sharedOtterRefs.position.copy(pos);
      sharedOtterRefs.heading = spawnHeading;
      sharedOtterRefs.isDashing = false;
      sharedOtterRefs.hasReset = true; // camera snap

      otterTelemetry.speed = 0;
      otterTelemetry.headingDeg = (spawnHeading * 180) / Math.PI;
      otterTelemetry.dashCooldownRemaining = 0;
      otterTelemetry.isDashing = false;
      otterTelemetry.inCurrent = false;
      otterTelemetry.position[0] = spawnPos[0];
      otterTelemetry.position[1] = GAME_CONSTANTS.WATER_SURFACE_Y;
      otterTelemetry.position[2] = spawnPos[1];
    }

    // Edge-detected R key restarts via store restart() (Requirement 1 & 4)
    const restartJustPressed = input.restart && !prevRestartRef.current;
    prevRestartRef.current = input.restart;
    if (restartJustPressed) {
      useGameStore.getState().restart();
    }

    // Ready screen start trigger (Enter or Space) in race mode (Requirement 2)
    if (mode === 'race' && phase === 'idle' && input.start) {
      gameState.startCountdown();
    }

    // Movement & Steering Input Permissions (Milestone 4 & 10)
    let allowSteering = true;
    let allowThrust = true;
    let allowDash = true;

    if (mode === 'hub') {
      if (gameState.isDialogueOpen) {
        // Lock player input during dialogue in the hub
        allowSteering = false;
        allowThrust = false;
        allowDash = false;
        v.set(0, 0, 0);
      }
    } else {
      // Race Flow Input Permissions
      if (phase === 'countdown' || phase === 'idle') {
        allowSteering = false;
        allowThrust = false;
        allowDash = false;
        v.set(0, 0, 0);
      } else if (phase === 'finished') {
        // After finishing, lock steering input and let the otter coast
        allowSteering = false;
        allowThrust = false;
        allowDash = false;
      }
    }

    // 2. Horizontal speed on X-Z plane
    const currentSpeed = Math.sqrt(v.x * v.x + v.z * v.z);

    // 3. Update Dash & Hazard Timers
    if (dashCooldownTimerRef.current > 0) {
      dashCooldownTimerRef.current = Math.max(0, dashCooldownTimerRef.current - dt);
    }
    if (dashBoostTimerRef.current > 0) {
      dashBoostTimerRef.current = Math.max(0, dashBoostTimerRef.current - dt);
    }
    if (hazardCooldownTimerRef.current > 0) {
      hazardCooldownTimerRef.current = Math.max(0, hazardCooldownTimerRef.current - dt);
    }

    // 4. Steering (Section 6.2)
    // Left Arrow / A (+1) turns left on screen (increases heading towards +X)
    // Right Arrow / D (-1) turns right on screen (decreases heading towards -X)
    let turnInput = 0;
    if (allowSteering) {
      if (input.left) turnInput += 1;
      if (input.right) turnInput -= 1;
    }

    const turnFactor = clamp(
      currentSpeed / GAME_CONSTANTS.TURN_SPEED_REF,
      GAME_CONSTANTS.TURN_FACTOR_MIN,
      GAME_CONSTANTS.TURN_FACTOR_MAX
    );

    headingRef.current += turnInput * tunables.turnRate * dt * turnFactor;
    const h = headingRef.current;

    // 5. Unit vectors for heading (facing +Z at h=0, screen-right is -X)
    const sinH = Math.sin(h);
    const cosH = Math.cos(h);
    const fwdX = sinH;
    const fwdZ = cosH;
    const rightX = -cosH;
    const rightZ = sinH;

    // 6. Dash Trigger (Space edge detection)
    const spaceIsPressed = input.dash && allowDash;
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
    if (input.forward && allowThrust) {
      const thrustMultiplier = isDashBoostActive ? tunables.dashThrustMult : 1.0;
      const accelMagnitude = tunables.accel * thrustMultiplier * dt;
      v.x += fwdX * accelMagnitude;
      v.z += fwdZ * accelMagnitude;
    }

    // 8. Drag and Braking (S / ArrowDown applies extra drag without reversing)
    const effectiveDrag = tunables.drag + (input.backward && allowThrust ? tunables.brakeDrag : 0);
    const dragMultiplier = Math.exp(-effectiveDrag * dt);
    v.x *= dragMultiplier;
    v.z *= dragMultiplier;

    // 9. Lateral Grip / Water Drift (Section 6.2)
    const vForward = v.x * fwdX + v.z * fwdZ;
    let vSide = v.x * rightX + v.z * rightZ;
    vSide *= Math.exp(-tunables.lateralDamp * dt);
    v.x = vForward * fwdX + vSide * rightX;
    v.z = vForward * fwdZ + vSide * rightZ;

    // 9.5 River Currents Acceleration (Milestone 5, Task A - Race mode only)
    let inAnyCurrent = false;
    if (mode === 'race' && (phase === 'racing' || phase === 'finished')) {
      const currentList = currentTrack.currents;
      const strengthScale = tunables.currentStrength / GAME_CONSTANTS.CURRENT_STRENGTH;
      for (let i = 0; i < currentList.length; i++) {
        const cur = currentList[i];
        const pts = cur.smoothedPoints ?? cur.points;
        const curRes = findNearestPointOnPolyline(pos.x, pos.z, pts);
        const d = curRes.distance;
        if (d < cur.width) {
          const ratio = d / cur.width;
          const falloff = 1 - ratio * ratio;

          // Compute distance s along current polyline for 8m fade-in & fade-out
          const cumDist = cur.cumDist;
          let s = 0;
          if (cumDist && cumDist.length > curRes.segmentIndex) {
            const segStart = pts[curRes.segmentIndex];
            const dxOnSeg = curRes.point[0] - segStart[0];
            const dzOnSeg = curRes.point[1] - segStart[1];
            s = cumDist[curRes.segmentIndex] + Math.hypot(dxOnSeg, dzOnSeg);
          }
          const totalLen = cur.totalLength ?? (cumDist ? cumDist[cumDist.length - 1] : 100);
          const fadeStart = clamp(s / GAME_CONSTANTS.CURRENT_FADE_DISTANCE, 0, 1);
          const fadeEnd = clamp((totalLen - s) / GAME_CONSTANTS.CURRENT_FADE_DISTANCE, 0, 1);
          const lengthFade = Math.min(fadeStart, fadeEnd);

          if (lengthFade > 0.01) {
            inAnyCurrent = true;
            const effAccel = (cur.strength * strengthScale) * falloff * lengthFade * dt;
            v.x += curRes.tangentX * effAccel;
            v.z += curRes.tangentZ * effAccel;
          }
        }
      }
    }

    // 10. Position update on X-Z plane
    pos.x += v.x * dt;
    pos.z += v.z * dt;

    // 11. Boundary Collision (Common Interface - Milestone 10)
    const boundary = mode === 'hub' ? hubBoundary : riverBoundary;
    boundary.resolveCollision(pos, v);

    // 11.5 Hazard Rocks Collision (Milestone 7, Task B - Race mode only)
    if (mode === 'race') {
      const hazards = currentTrack.hazards;
      const otterRad = GAME_CONSTANTS.OTTER_RADIUS;
      for (let i = 0; i < hazards.length; i++) {
        const rock = hazards[i];
        const totalRad = rock.radius + otterRad;
        const dx = pos.x - rock.pos[0];
        const dz = pos.z - rock.pos[1];
        const distSq = dx * dx + dz * dz;

        if (distSq < totalRad * totalRad) {
          const dist = Math.sqrt(distSq);
          let nx = 0;
          let nz = 1;
          if (dist > 0.0001) {
            nx = dx / dist;
            nz = dz / dist;
          }

          // Push otter out along contact normal
          pos.x = rock.pos[0] + nx * totalRad;
          pos.z = rock.pos[1] + nz * totalRad;

          // Remove inward velocity component
          const normalVel = v.x * nx + v.z * nz;
          if (normalVel < 0) {
            v.x -= normalVel * nx;
            v.z -= normalVel * nz;
          }

          // Multiply speed by 0.5 with 0.4s cooldown
          if (hazardCooldownTimerRef.current <= 0) {
            hazardCooldownTimerRef.current = GAME_CONSTANTS.HAZARD_COOLDOWN;
            v.x *= GAME_CONSTANTS.HAZARD_SPEED_MULTIPLIER;
            v.z *= GAME_CONSTANTS.HAZARD_SPEED_MULTIPLIER;
          }
        }
      }
    }

    // 12. Checkpoint Hit Detection (Milestone 4, Requirement 2 & 5 - Race mode only)
    // Only checked in order using squared-distance checks (zero allocations in useFrame)
    if (mode === 'race' && phase === 'racing') {
      const currentCpIndex = gameState.nextCheckpoint;
      if (currentCpIndex < currentTrack.checkpoints.length) {
        const cp = currentTrack.checkpoints[currentCpIndex];
        const dx = pos.x - cp.pos[0];
        const dz = pos.z - cp.pos[1];
        const distSq = dx * dx + dz * dz;
        const radiusSq = cp.radius * cp.radius;

        if (distSq <= radiusSq) {
          if (currentCpIndex === currentTrack.checkpoints.length - 1) {
            // Crossed the final checkpoint (Finish line)
            const finishTimestamp = performance.now();
            const totalElapsed = gameState.raceStartTime
              ? finishTimestamp - gameState.raceStartTime
              : 0;
            gameState.finish(totalElapsed, otterTelemetry.playerRank);
          } else {
            // Milestone checkpoint passed
            gameState.hitCheckpoint(currentCpIndex);
          }
        }
      }
    }

    // 13. Visual Feedback (Cosmetic only, Section 6.2)
    const targetRoll = -turnInput * GAME_CONSTANTS.ROLL_MAX;
    const rollBlend = 1 - Math.exp(-GAME_CONSTANTS.ROLL_DAMP * dt);
    currentRollRef.current += (targetRoll - currentRollRef.current) * rollBlend;

    const speedRatio = clamp(currentSpeed / (tunables.accel / tunables.drag), 0, 1.5);
    bobPhaseRef.current += dt * (GAME_CONSTANTS.BOB_FREQUENCY * Math.max(0.4, speedRatio));
    const bobOffsetY = Math.sin(bobPhaseRef.current) * GAME_CONSTANTS.BOB_AMPLITUDE * speedRatio;

    let scaleX = 1.0;
    let scaleY = 1.0;
    let scaleZ = 1.0;
    if (isDashBoostActive) {
      const dashProgress = dashBoostTimerRef.current / tunables.dashDuration;
      scaleZ = 1.0 + GAME_CONSTANTS.SQUASH_STRETCH_AMOUNT * dashProgress;
      scaleX = 1.0 - (GAME_CONSTANTS.SQUASH_STRETCH_AMOUNT * 0.5) * dashProgress;
      scaleY = scaleX;
    }

    // Apply transforms to Three.js Object3D hierarchy
    if (rootGroupRef.current) {
      rootGroupRef.current.position.set(pos.x, GAME_CONSTANTS.WATER_SURFACE_Y, pos.z);
      rootGroupRef.current.rotation.y = headingRef.current;
    }

    if (visualGroupRef.current) {
      visualGroupRef.current.position.y = bobOffsetY;
      visualGroupRef.current.rotation.z = currentRollRef.current;
      visualGroupRef.current.scale.set(scaleX, scaleY, scaleZ);
    }

    // Water Wake & Dash Streaks
    if (wakeMeshRef.current) {
      const wakeScale = clamp(currentSpeed / 4.0, 0.4, 2.0);
      wakeMeshRef.current.scale.set(wakeScale, wakeScale * 1.5, 1);
      (wakeMeshRef.current.material as THREE.Material).opacity = clamp(currentSpeed / 6.0, 0.1, 0.7);
    }

    if (dashStreaksRef.current) {
      dashStreaksRef.current.visible = isDashBoostActive;
    }

    // Update Shared Refs for CameraRig (Milestone 2)
    sharedOtterRefs.position.copy(pos);
    sharedOtterRefs.heading = headingRef.current;
    sharedOtterRefs.isDashing = isDashBoostActive;

    // Update Telemetry Store for live HUD without React re-renders
    otterTelemetry.speed = currentSpeed;
    const deg = ((headingRef.current * (180 / Math.PI)) % 360 + 360) % 360;
    otterTelemetry.headingDeg = deg;
    otterTelemetry.dashCooldownRemaining = dashCooldownTimerRef.current;
    otterTelemetry.isDashing = isDashBoostActive;
    otterTelemetry.inCurrent = inAnyCurrent;
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
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#8d5b34"
          />
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
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#d8c5a4"
          />
        </mesh>

        {/* Cute snout at front (+Z) */}
        <mesh position={[0, 0.15, 0.85]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#c2a47a"
          />
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
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#734524"
          />
        </mesh>

        {/* Right ear */}
        <mesh position={[-0.26, 0.42, 0.4]} rotation={[0, 0, 0.3]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#734524"
          />
        </mesh>

        {/* Swimming tail at the rear (-Z) */}
        <mesh position={[0, 0.12, -0.9]} rotation={[-0.2, 0, 0]}>
          <coneGeometry args={[0.2, 0.65, 16]} />
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#734524"
          />
        </mesh>
      </group>

      {/* Water Wake Foam Oval trailing behind the otter */}
      <mesh
        ref={wakeMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, -0.8]}
      >
        <ringGeometry args={[0.3, 0.65, 24]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.4} />
      </mesh>

      {/* Anime Dash Speed Lines */}
      <group ref={dashStreaksRef} visible={false}>
        <mesh position={[0.6, 0.3, -1.8]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 2.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[-0.6, 0.3, -1.8]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 2.5]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.6, -2.0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.04, 0.04, 2.8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}
