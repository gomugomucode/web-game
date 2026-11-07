'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Track } from './tracks/types';
import { GAME_CONSTANTS } from './constants';
import { smoothCenterline } from './math';
import { useGameStore } from './useGameStore';

interface CurrentsProps {
  track: Track;
}

interface CurrentStreak {
  currentIdx: number;
  progress: number;
  speed: number;
  lateralOffset: number;
}

interface ProcessedCurrent {
  id: string;
  smoothedPoints: [number, number][];
  cumDist: number[];
  totalLength: number;
  width: number;
  geometry: THREE.BufferGeometry;
}

function createInitialStreaks(currentCount: number, widths: number[]): CurrentStreak[] {
  const list: CurrentStreak[] = [];
  const perCurrent = GAME_CONSTANTS.CURRENT_STREAK_COUNT;

  for (let curIdx = 0; curIdx < currentCount; curIdx++) {
    const curWidth = widths[curIdx] || GAME_CONSTANTS.CURRENT_WIDTH;
    for (let i = 0; i < perCurrent; i++) {
      // Deterministic pseudo-random distribution
      const seed1 = ((i * 9301 + 49297 + curIdx * 12345) % 233280) / 233280;
      const seed2 = (((i + 17) * 9301 + 49297) % 233280) / 233280;
      const seed3 = (((i + 31) * 9301 + 49297) % 233280) / 233280;

      const progress = (i / perCurrent + seed1 * 0.25) % 1.0;
      const lateralOffset = (seed2 - 0.5) * (curWidth * 1.5);
      const speed = GAME_CONSTANTS.CURRENT_STREAK_SPEED * (0.85 + seed3 * 0.3);

      list.push({
        currentIdx: curIdx,
        progress,
        speed,
        lateralOffset,
      });
    }
  }

  return list;
}

export function Currents({ track }: CurrentsProps) {
  // 1. Use precomputed shared smoothed polyline and cumulative arc-lengths for each current (Task A)
  const processedCurrents = useMemo<ProcessedCurrent[]>(() => {
    return track.currents.map((cur) => {
      const smoothed = cur.smoothedPoints ?? smoothCenterline(cur.points, 12);
      const cumDist = cur.cumDist ?? (() => {
        const cd: number[] = [0];
        for (let i = 0; i < smoothed.length - 1; i++) {
          cd.push(cd[i] + Math.hypot(smoothed[i + 1][0] - smoothed[i][0], smoothed[i + 1][1] - smoothed[i][1]));
        }
        return cd;
      })();

      const totalLength = cur.totalLength ?? (cumDist[cumDist.length - 1] || 1);

      // Build quad ribbon geometry along current polyline
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const count = smoothed.length;
      const halfW = cur.width; // influence width is half-extent on each side

      for (let i = 0; i < count; i++) {
        const curr = smoothed[i];
        const prev = smoothed[Math.max(0, i - 1)];
        const next = smoothed[Math.min(count - 1, i + 1)];

        let dx = next[0] - prev[0];
        let dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len;
        dz /= len;

        // Normal perpendicular to tangent on X-Z plane
        const nx = -dz;
        const nz = dx;

        // Vertices placed slightly above water surface (y = 0.006) to prevent z-fighting
        const y = GAME_CONSTANTS.WATER_SURFACE_Y + GAME_CONSTANTS.CURRENT_STRIP_HEIGHT;
        const lx = curr[0] + nx * halfW;
        const lz = curr[1] + nz * halfW;
        const rx = curr[0] - nx * halfW;
        const rz = curr[1] - nz * halfW;

        positions.push(lx, y, lz);
        positions.push(rx, y, rz);

        const vCoord = cumDist[i] / totalLength;
        uvs.push(0, vCoord, 1, vCoord);
      }

      for (let i = 0; i < count - 1; i++) {
        const row = i * 2;
        indices.push(row, row + 1, row + 2);
        indices.push(row + 1, row + 3, row + 2);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      return {
        id: cur.id,
        smoothedPoints: smoothed,
        cumDist,
        totalLength,
        width: cur.width,
        geometry: geo,
      };
    });
  }, [track.currents]);

  // Merged geometry for all current tint strips (Milestone 9 optimization)
  const mergedCurrentsGeo = useMemo(() => {
    const geoms = processedCurrents.map((c) => c.geometry);
    if (geoms.length === 0) return null;
    return mergeGeometries(geoms, false);
  }, [processedCurrents]);

  // 2. Pre-generate deterministic flow streak descriptors in a mutable ref (~40 streaks per current)
  const totalStreakCount = track.currents.length * GAME_CONSTANTS.CURRENT_STREAK_COUNT;
  const streaksRef = useRef<CurrentStreak[]>(
    createInitialStreaks(
      track.currents.length,
      track.currents.map((c) => c.width)
    )
  );

  // 3. Preallocated scratch objects for zero-allocation useFrame loop
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useRef(new THREE.Matrix4());
  const tempPos = useRef(new THREE.Vector3());
  const tempQuat = useRef(new THREE.Quaternion());
  const tempScale = useRef(new THREE.Vector3(1, 1, 1));
  const tempEuler = useRef(new THREE.Euler());

  useFrame((_, delta) => {
    if (useGameStore.getState().isPaused) return;
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0 || !instancedMeshRef.current || processedCurrents.length === 0) return;

    const streaks = streaksRef.current;
    if (!streaks) return;

    const matrix = tempMatrix.current;
    const pos = tempPos.current;
    const quat = tempQuat.current;
    const scale = tempScale.current;
    const euler = tempEuler.current;

    for (let i = 0; i < streaks.length; i++) {
      const streak = streaks[i];
      const cur = processedCurrents[streak.currentIdx];
      if (!cur) continue;

      // Advance progress downstream along the current length
      streak.progress = (streak.progress + (streak.speed * dt) / cur.totalLength) % 1.0;

      // Sample position and tangent from cumulative distance
      const targetDist = streak.progress * cur.totalLength;
      const cumDist = cur.cumDist;
      const pts = cur.smoothedPoints;

      let idx = 0;
      while (idx < cumDist.length - 2 && cumDist[idx + 1] < targetDist) {
        idx++;
      }

      const segLen = cumDist[idx + 1] - cumDist[idx] || 1;
      const u = Math.min(Math.max((targetDist - cumDist[idx]) / segLen, 0), 1);
      const p1 = pts[idx];
      const p2 = pts[idx + 1];

      let segDx = p2[0] - p1[0];
      let segDz = p2[1] - p1[1];
      const slen = Math.hypot(segDx, segDz) || 1;
      segDx /= slen;
      segDz /= slen;

      // Normal perpendicular to segment
      const nx = -segDz;
      const nz = segDx;

      // Position along polyline with lateral offset
      const x = p1[0] + u * (p2[0] - p1[0]) + nx * streak.lateralOffset;
      const z = p1[1] + u * (p2[1] - p1[1]) + nz * streak.lateralOffset;
      const y = GAME_CONSTANTS.WATER_SURFACE_Y + 0.012; // Floating above the tinted strip

      // Yaw rotation aligned with flow direction (heading towards +Z is yaw = 0)
      const yaw = Math.atan2(segDx, segDz);
      euler.set(0, yaw, 0);
      quat.setFromEuler(euler);

      // Fade streaks at the start and end of the current
      const fade = Math.sin(streak.progress * Math.PI);
      scale.set(1.0, 1.0, 0.4 + 0.8 * fade);

      pos.set(x, y, z);
      matrix.compose(pos, quat, scale);
      instancedMeshRef.current.setMatrixAt(i, matrix);
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* 1. Lighter tinted strips along currents at the water surface (single merged mesh) */}
      {mergedCurrentsGeo && (
        <mesh geometry={mergedCurrentsGeo} renderOrder={2}>
          <meshBasicMaterial
            color={GAME_CONSTANTS.CURRENT_TINT_COLOR}
            transparent
            opacity={0.38}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* 2. Animated flow streaks as a single InstancedMesh moving downstream */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, totalStreakCount]}
        renderOrder={3}
      >
        <boxGeometry args={[0.22, 0.012, 1.3]} />
        <meshBasicMaterial
          color={GAME_CONSTANTS.CURRENT_STREAK_COLOR}
          transparent
          opacity={0.82}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
