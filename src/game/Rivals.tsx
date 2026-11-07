'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { getTrack, getTrackMetadata, TrackMetadata } from './tracks/registry';
import { Track } from './tracks/types';
import { useGameStore } from './useGameStore';
import { sharedOtterRefs } from './sharedRefs';
import { otterTelemetry } from './telemetry';
import { threeStepGradientMap } from './toonGradient';
import { findNearestPointOnPolyline } from './math';

// Reusable scratch registers for zero-allocation useFrame loop
const scratchPos = new THREE.Vector3();
const scratchTangent = new THREE.Vector3();
const scratchNormal = new THREE.Vector3();
const scratchDir = new THREE.Vector3();

interface RivalState {
  id: string;
  name: string;
  s: number;
  speed: number;
  targetSpeed: number;
  lane: number;
  finished: boolean;
  finishTime: number | null;
  pos: THREE.Vector3;
  prevPos: THREE.Vector3;
  heading: number;
  roll: number;
  bobPhase: number;
}

interface RivalsProps {
  track?: Track;
}

export function Rivals({ track }: RivalsProps) {
  const lastRunIdRef = useRef(useGameStore.getState().runId);
  const lastTrackIdRef = useRef(useGameStore.getState().activeTrackId);

  // References to rival groups for direct matrix/transform updates
  const groupRefs = useRef<(THREE.Group | null)[]>([null, null, null]);

  // Shared geometries for simplified rival otters (Section 3: max performance, only 3 meshes per rival)
  const geometries = useMemo(() => {
    const body = new THREE.CapsuleGeometry(
      GAME_CONSTANTS.OTTER_RADIUS,
      GAME_CONSTANTS.OTTER_LENGTH,
      8,
      16
    );
    const snout = new THREE.SphereGeometry(0.22, 10, 10);
    return { body, snout };
  }, []);

  const initialTrack = track || getTrack(useGameStore.getState().activeTrackId);
  const initialMeta = getTrackMetadata(initialTrack);
  const trackMetaRef = useRef<TrackMetadata>(initialMeta);

  // Initialize deterministic rival state structures once in a mutable ref
  const rivalsRef = useRef<RivalState[]>(
    GAME_CONSTANTS.RIVAL_PROFILES.map((profile, idx) => {
      const initialS = initialMeta.startTrackDistance + profile.staggerZ;
      initialMeta.sampleTrack(initialS, scratchPos, scratchTangent, scratchNormal);
      const startX = scratchPos.x + scratchNormal.x * profile.lane;
      const startZ = scratchPos.z + scratchNormal.z * profile.lane;
      const startHeading = Math.atan2(scratchTangent.x, scratchTangent.z);

      return {
        id: profile.id,
        name: profile.name,
        s: initialS,
        speed: 0,
        targetSpeed: 0,
        lane: profile.lane,
        finished: false,
        finishTime: null,
        pos: new THREE.Vector3(startX, GAME_CONSTANTS.WATER_SURFACE_Y, startZ),
        prevPos: new THREE.Vector3(startX, GAME_CONSTANTS.WATER_SURFACE_Y, startZ),
        heading: startHeading,
        roll: 0,
        bobPhase: idx * 2.094, // 2*PI / 3 deterministic phase offset
      };
    })
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0) return;

    const gameState = useGameStore.getState();
    if (gameState.isPaused) return;

    const phase = gameState.phase;
    const rivals = rivalsRef.current;
    const profiles = GAME_CONSTANTS.RIVAL_PROFILES;
    const playerCruiseSpeed = GAME_CONSTANTS.ACCEL / GAME_CONSTANTS.DRAG; // ~11.11 m/s

    const currentTrack = track || getTrack(gameState.activeTrackId);

    // Update track metadata cache reference when track changes
    if (gameState.activeTrackId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = gameState.activeTrackId;
      trackMetaRef.current = getTrackMetadata(currentTrack);
    }
    const meta = trackMetaRef.current;

    // Deterministic Reset on runId or track change (Requirement 2 & 5)
    if (gameState.runId !== lastRunIdRef.current) {
      lastRunIdRef.current = gameState.runId;
      for (let i = 0; i < rivals.length; i++) {
        const r = rivals[i];
        const profile = profiles[i];
        r.s = meta.startTrackDistance + profile.staggerZ;
        r.speed = 0;
        r.targetSpeed = 0;
        r.lane = profile.lane;
        r.finished = false;
        r.finishTime = null;
        r.roll = 0;
        r.bobPhase = i * 2.0;

        meta.sampleTrack(r.s, scratchPos, scratchTangent, scratchNormal);
        r.pos.set(
          scratchPos.x + scratchNormal.x * profile.lane,
          GAME_CONSTANTS.WATER_SURFACE_Y,
          scratchPos.z + scratchNormal.z * profile.lane
        );
        r.prevPos.copy(r.pos);
        r.heading = Math.atan2(scratchTangent.x, scratchTangent.z);

        const group = groupRefs.current[i];
        if (group) {
          group.position.copy(r.pos);
          group.rotation.set(0, r.heading, 0);
        }
      }
    }

    // Movement and Steering
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      const profile = profiles[i];
      r.prevPos.copy(r.pos);

      if (phase === 'idle' || phase === 'countdown') {
        r.speed = 0;
        // Gentle idle water bobbing at start line
        r.bobPhase += dt * 4.0;
        r.pos.y = GAME_CONSTANTS.WATER_SURFACE_Y + Math.sin(r.bobPhase) * 0.02;
      } else if (phase === 'racing' || phase === 'finished') {
        // Base cruising speed (92% - 102% of player cruise speed)
        let baseSpeed = profile.speedMult * playerCruiseSpeed;

        // Smooth sinusoidal speed variation along track
        baseSpeed += Math.sin(r.s * 0.04 + i * 1.5) * 0.45;

        // Check if rival is inside a current zone (same rule as player, read from active track)
        for (let c = 0; c < currentTrack.currents.length; c++) {
          const cur = currentTrack.currents[c];
          const curPoints = cur.smoothedPoints ?? cur.points;
          const cRes = findNearestPointOnPolyline(r.pos.x, r.pos.z, curPoints);
          if (cRes.distance < cur.width) {
            const falloff = 1.0 - (cRes.distance / cur.width) ** 2;
            const curLen = cur.totalLength ?? 100;
            const curArcS = (cRes.segmentIndex / Math.max(1, curPoints.length - 1)) * curLen;
            const fadeStart = Math.min(Math.max(curArcS / 8.0, 0), 1);
            const fadeEnd = Math.min(Math.max((curLen - curArcS) / 8.0, 0), 1);
            const curFade = fadeStart * fadeEnd;
            // Add current acceleration boost
            baseSpeed += cur.strength * 0.3 * falloff * curFade;
          }
        }

        r.targetSpeed = baseSpeed;

        if (!r.finished) {
          // Smooth acceleration to target speed
          r.speed += (r.targetSpeed - r.speed) * Math.min(1, dt * 2.5);
          r.s += r.speed * dt;

          // Check if rival crossed finish line
          if (r.s >= meta.finishTrackDistance) {
            r.finished = true;
            if (r.finishTime === null && gameState.raceStartTime !== null) {
              r.finishTime = performance.now() - gameState.raceStartTime;
            }
          }
        } else {
          // Coasting decelerate past finish line
          r.speed = Math.max(0, r.speed - dt * 3.5);
          r.s += r.speed * dt;
        }

        // --- Lateral Lane following & Hazard Rock Avoidance ---
        // 1. Natural slow lane undulation along track
        let desiredLane = profile.lane + Math.sin(r.s * profile.waveFreq + i * 1.8) * profile.waveAmp;

        // 2. Smoothly steer around hazard rocks with lane offsets (Read dynamically from active track data)
        const hazardCoords = meta.hazardCoords;
        for (let h = 0; h < hazardCoords.length; h++) {
          const haz = hazardCoords[h];
          const ds = r.s - haz.s;
          // When rival is within 5m of a rock along track
          if (Math.abs(ds) < GAME_CONSTANTS.RIVAL_HAZARD_AVOID_RADIUS) {
            const distLat = desiredLane - haz.lateral;
            // If nominal lane would place rival within danger envelope
            if (Math.abs(distLat) < haz.radius + 1.2) {
              // Steer left or right away from the rock center
              const avoidSide = distLat >= 0 ? 1 : -1;
              const bell = Math.cos((ds / GAME_CONSTANTS.RIVAL_HAZARD_AVOID_RADIUS) * (Math.PI / 2)) ** 2;
              desiredLane += avoidSide * GAME_CONSTANTS.RIVAL_HAZARD_AVOID_PUSH * bell;
            }
          }
        }

        // Keep lane safely inside navigable river corridor (river half-width = 9m)
        desiredLane = Math.min(Math.max(desiredLane, -7.0), 7.0);

        // Smooth lane change
        r.lane += (desiredLane - r.lane) * Math.min(1, dt * 3.0);

        // Sample track at new distance and apply lateral offset
        meta.sampleTrack(r.s, scratchPos, scratchTangent, scratchNormal);
        r.pos.x = scratchPos.x + scratchNormal.x * r.lane;
        r.pos.z = scratchPos.z + scratchNormal.z * r.lane;

        // Swimming bobbing
        r.bobPhase += dt * GAME_CONSTANTS.BOB_FREQUENCY;
        r.pos.y = GAME_CONSTANTS.WATER_SURFACE_Y + Math.sin(r.bobPhase) * 0.04;

        // Heading derived from actual displacement
        scratchDir.subVectors(r.pos, r.prevPos);
        scratchDir.y = 0;
        if (scratchDir.lengthSq() > 1e-6) {
          scratchDir.normalize();
          const targetHeading = Math.atan2(scratchDir.x, scratchDir.z);
          // Angle wrapping
          let diff = targetHeading - r.heading;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          r.heading += diff * Math.min(1, dt * 8.0);
          r.roll += (-diff * 1.5 - r.roll) * Math.min(1, dt * 5.0);
        }
      }

      // Soft visual separation from player (never blocks race)
      const pPos = sharedOtterRefs.position;
      const dxP = r.pos.x - pPos.x;
      const dzP = r.pos.z - pPos.z;
      const distPlayerSq = dxP * dxP + dzP * dzP;
      const sepRadius = GAME_CONSTANTS.RIVAL_SEPARATION_RADIUS;
      if (distPlayerSq > 1e-4 && distPlayerSq < sepRadius * sepRadius) {
        const distP = Math.sqrt(distPlayerSq);
        const push = (sepRadius - distP) * 0.35;
        r.pos.x += (dxP / distP) * push;
        r.pos.z += (dzP / distP) * push;
      }

      // Update group transform
      const group = groupRefs.current[i];
      if (group) {
        group.position.copy(r.pos);
        group.rotation.set(0, r.heading, r.roll);
      }
    }

    // 5. Compute Live Player Position / Leaderboard Rank
    // Project player position onto active track smoothed centerline
    const pPos = sharedOtterRefs.position;
    const playerProj = findNearestPointOnPolyline(pPos.x, pPos.z, meta.smoothedCenterline);
    const segIdx = Math.max(0, Math.min(meta.smoothedCenterline.length - 2, playerProj.segmentIndex));
    const pSegA = meta.smoothedCenterline[segIdx];
    const pSegB = meta.smoothedCenterline[segIdx + 1];
    const segDx = pSegB[0] - pSegA[0];
    const segDz = pSegB[1] - pSegA[1];
    const segLenSq = segDx * segDx + segDz * segDz;
    const segLen = Math.sqrt(segLenSq);
    const projT = segLenSq < 1e-6 ? 0 : Math.max(0, Math.min(1, ((playerProj.point[0] - pSegA[0]) * segDx + (playerProj.point[1] - pSegA[1]) * segDz) / segLenSq));
    const playerTrackS = meta.centerlineCumDist[segIdx] + projT * segLen;

    const playerFinished = gameState.phase === 'finished';
    const playerTime = gameState.finishTime;

    let rank = 1;
    for (let i = 0; i < rivals.length; i++) {
      const r = rivals[i];
      if (playerFinished && playerTime !== null) {
        // If player finished, check if rival also finished earlier
        if (r.finished && r.finishTime !== null) {
          if (r.finishTime < playerTime) {
            rank++;
          }
        }
      } else {
        // While racing: finished rivals are ahead, or rivals further down track
        if (r.finished) {
          rank++;
        } else if (r.s > playerTrackS) {
          rank++;
        }
      }
    }

    // Zero-allocation identification of top-performing rival for results dialogue
    let bestRivalIdx = 0;
    for (let i = 1; i < rivals.length; i++) {
      const a = rivals[bestRivalIdx];
      const b = rivals[i];
      let bIsBetter = false;
      if (b.finished && a.finished) {
        bIsBetter = (b.finishTime ?? Infinity) < (a.finishTime ?? Infinity);
      } else if (b.finished) {
        bIsBetter = true;
      } else if (!a.finished) {
        bIsBetter = b.s > a.s;
      }
      if (bIsBetter) {
        bestRivalIdx = i;
      }
    }
    const leaderRivalId = rivals[bestRivalIdx]?.id ?? null;

    if (gameState.phase === 'racing') {
      otterTelemetry.playerRank = rank;
      if (
        gameState.winningRivalId !== leaderRivalId ||
        gameState.secondPlaceRivalId !== leaderRivalId
      ) {
        useGameStore.setState({
          winningRivalId: leaderRivalId,
          secondPlaceRivalId: leaderRivalId,
        });
      }
    } else if (playerFinished) {
      otterTelemetry.playerRank = gameState.playerRank;
      if (
        gameState.winningRivalId !== leaderRivalId ||
        gameState.secondPlaceRivalId !== leaderRivalId
      ) {
        useGameStore.setState({
          winningRivalId: leaderRivalId,
          secondPlaceRivalId: leaderRivalId,
        });
      }
    }
  });

  return (
    <group>
      {GAME_CONSTANTS.RIVAL_PROFILES.map((profile, idx) => (
        <group
          key={profile.id}
          ref={(el) => {
            groupRefs.current[idx] = el;
          }}
        >
          {/* 1. Body Capsule */}
          <mesh
            geometry={geometries.body}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0.15, 0]}
          >
            <meshToonMaterial
              gradientMap={threeStepGradientMap}
              color={profile.bodyColor}
            />
          </mesh>

          {/* 2. Inverted-hull Cartoon Outline */}
          <mesh
            geometry={geometries.body}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0.15, 0]}
            scale={[1.08, 1.08, 1.05]}
          >
            <meshBasicMaterial
              color={profile.outlineColor}
              side={THREE.BackSide}
            />
          </mesh>

          {/* 3. Snout */}
          <mesh
            geometry={geometries.snout}
            position={[0, 0.15, 0.85]}
          >
            <meshToonMaterial
              gradientMap={threeStepGradientMap}
              color={profile.snoutColor}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
