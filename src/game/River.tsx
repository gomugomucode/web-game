'use client';

import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Track } from './tracks/types';
import { smoothCenterline, findNearestPointOnPolyline } from './math';
import { GAME_CONSTANTS } from './constants';
import { useGameStore } from './useGameStore';
import { threeStepGradientMap } from './toonGradient';
import { sharedWaterMaterial } from './WaterMaterial';

interface RiverProps {
  track: Track;
}

export function River({ track }: RiverProps) {
  // Subscribe to race state for checkpoint highlights
  const nextCheckpoint = useGameStore((state) => state.nextCheckpoint);
  const phase = useGameStore((state) => state.phase);

  // Pre-calculate smoothed spline centerline points and meshes (Step 0)
  const { waterGeo, banksGeo } = useMemo(() => {
    const smoothed = track.smoothedCenterline ?? smoothCenterline(track.centerline, 14);
    const count = smoothed.length;
    const halfWidth = track.halfWidth;
    const bankHeight = GAME_CONSTANTS.BANK_HEIGHT;
    const bankWidth = GAME_CONSTANTS.BANK_WIDTH;

    // 1. Water Ribbon Geometry (strip of quads along centerline)
    const waterPositions: number[] = [];
    const waterUvs: number[] = [];
    const waterIndices: number[] = [];

    // 2. Left Bank Geometry (slope + grassy top)
    const leftPositions: number[] = [];
    const leftUvs: number[] = [];
    const leftIndices: number[] = [];

    // 3. Right Bank Geometry (slope + grassy top)
    const rightPositions: number[] = [];
    const rightUvs: number[] = [];
    const rightIndices: number[] = [];

    let cumDist = 0;
    for (let i = 0; i < count; i++) {
      const curr = smoothed[i];
      const prev = smoothed[Math.max(0, i - 1)];
      const next = smoothed[Math.min(count - 1, i + 1)];

      if (i > 0) {
        const segDx = curr[0] - prev[0];
        const segDz = curr[1] - prev[1];
        cumDist += Math.sqrt(segDx * segDx + segDz * segDz);
      }

      // Tangent vector along centerline
      let dx = next[0] - prev[0];
      let dz = next[1] - prev[1];
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      dx /= len;
      dz /= len;

      // Normal perpendicular to tangent on X-Z plane
      const nx = -dz;
      const nz = dx;

      // Left and right waterline vertices at y = 0
      const leftEdgeX = curr[0] + nx * halfWidth;
      const leftEdgeZ = curr[1] + nz * halfWidth;

      const rightEdgeX = curr[0] - nx * halfWidth;
      const rightEdgeZ = curr[1] - nz * halfWidth;

      // Metric UV coordinate along river length (1.0 V unit = 18m river width)
      const vCoord = cumDist / (halfWidth * 2);

      // --- Water Ribbon ---
      waterPositions.push(leftEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, leftEdgeZ);
      waterPositions.push(rightEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, rightEdgeZ);
      waterUvs.push(0, vCoord, 1, vCoord);

      // --- Left Bank (Waterline -> Crest -> Outer Top) ---
      const leftCrestX = curr[0] + nx * (halfWidth + 1.2);
      const leftCrestZ = curr[1] + nz * (halfWidth + 1.2);
      const leftOuterX = curr[0] + nx * (halfWidth + bankWidth);
      const leftOuterZ = curr[1] + nz * (halfWidth + bankWidth);

      leftPositions.push(leftEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, leftEdgeZ);
      leftPositions.push(leftCrestX, bankHeight, leftCrestZ);
      leftPositions.push(leftOuterX, bankHeight * 0.95, leftOuterZ);

      leftUvs.push(0, vCoord, 0.5, vCoord, 1, vCoord);

      // --- Right Bank (Waterline -> Crest -> Outer Top) ---
      const rightCrestX = curr[0] - nx * (halfWidth + 1.2);
      const rightCrestZ = curr[1] - nz * (halfWidth + 1.2);
      const rightOuterX = curr[0] - nx * (halfWidth + bankWidth);
      const rightOuterZ = curr[1] - nz * (halfWidth + bankWidth);

      rightPositions.push(rightEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, rightEdgeZ);
      rightPositions.push(rightCrestX, bankHeight, rightCrestZ);
      rightPositions.push(rightOuterX, bankHeight * 0.95, rightOuterZ);

      rightUvs.push(0, vCoord, 0.5, vCoord, 1, vCoord);
    }

    // Build quad indices for water ribbon
    for (let i = 0; i < count - 1; i++) {
      const row = i * 2;
      waterIndices.push(row, row + 1, row + 2);
      waterIndices.push(row + 1, row + 3, row + 2);
    }

    // Build indices for banks (2 quads = 4 triangles per slice)
    for (let i = 0; i < count - 1; i++) {
      const rowL = i * 3;
      leftIndices.push(rowL, rowL + 1, rowL + 3);
      leftIndices.push(rowL + 1, rowL + 4, rowL + 3);
      leftIndices.push(rowL + 1, rowL + 2, rowL + 4);
      leftIndices.push(rowL + 2, rowL + 5, rowL + 4);

      const rowR = i * 3;
      rightIndices.push(rowR, rowR + 3, rowR + 1);
      rightIndices.push(rowR + 1, rowR + 3, rowR + 4);
      rightIndices.push(rowR + 1, rowR + 4, rowR + 2);
      rightIndices.push(rowR + 2, rowR + 4, rowR + 5);
    }

    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
    wGeo.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
    wGeo.setIndex(waterIndices);
    wGeo.computeVertexNormals();

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftPositions, 3));
    lGeo.setAttribute('uv', new THREE.Float32BufferAttribute(leftUvs, 2));
    lGeo.setIndex(leftIndices);
    lGeo.computeVertexNormals();

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightPositions, 3));
    rGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rightUvs, 2));
    rGeo.setIndex(rightIndices);
    rGeo.computeVertexNormals();

    const banksGeo = mergeGeometries([lGeo, rGeo], false);
    lGeo.dispose();
    rGeo.dispose();

    return { waterGeo: wGeo, banksGeo };
  }, [track]);

  // Compute exact yaw rotation angles for each checkpoint so arches face river flow
  const checkpointRotations = useMemo(() => {
    const center = track.smoothedCenterline ?? track.centerline;
    return track.checkpoints.map((cp) => {
      const res = findNearestPointOnPolyline(cp.pos[0], cp.pos[1], center);
      return Math.atan2(res.tangentX, res.tangentZ);
    });
  }, [track]);

  const finishCheckpointIndex = track.checkpoints.length - 1;
  const finishCp = track.checkpoints[finishCheckpointIndex];
  const finishRotY = checkpointRotations[finishCheckpointIndex];

  // Animate water shader time uniform per frame (Milestone 6)
  useFrame((_, delta) => {
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    sharedWaterMaterial.uniforms.uTime.value += dt;
  });

  return (
    <group>
      {/* 1. River Water Surface Ribbon (Animated Shader) */}
      <mesh geometry={waterGeo} material={sharedWaterMaterial} renderOrder={1} />

      {/* 2. Raised River Banks (Merged left and right banks) */}
      <mesh geometry={banksGeo}>
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color={GAME_CONSTANTS.BANK_TOP_COLOR}
        />
      </mesh>

      {/* 3. Start Gate Arch at track start position */}
      <StartGate position={[track.start.pos[0], 0, track.start.pos[1]]} />

      {/* 4. Checkpoint Gates (Checkpoints 0, 1, 2) - Requirement 2 */}
      {track.checkpoints.slice(0, finishCheckpointIndex).map((cp, idx) => {
        const isNext = nextCheckpoint === idx && phase === 'racing';
        const isCompleted = nextCheckpoint > idx;
        const rotY = checkpointRotations[idx];

        return (
          <CheckpointGate
            key={`cp-gate-${idx}`}
            index={idx}
            position={[cp.pos[0], 0, cp.pos[1]]}
            rotationY={rotY}
            isNext={isNext}
            isCompleted={isCompleted}
          />
        );
      })}

      {/* 5. Finish Gate Arch at final checkpoint - Not duplicated (Requirement 2) */}
      <FinishGate
        position={[finishCp.pos[0], 0, finishCp.pos[1]]}
        rotationY={finishRotY}
        isNext={nextCheckpoint === finishCheckpointIndex && phase === 'racing'}
        isCompleted={nextCheckpoint > finishCheckpointIndex}
      />
    </group>
  );
}

// Pre-merged static gate geometries to minimize draw calls (Milestone 9)
const startGateFrameGeo = (() => {
  const lp = new THREE.CylinderGeometry(0.3, 0.35, 5, 8);
  lp.translate(-8.5, 2.5, 0);
  const rp = new THREE.CylinderGeometry(0.3, 0.35, 5, 8);
  rp.translate(8.5, 2.5, 0);
  const cb = new THREE.CylinderGeometry(0.25, 0.25, 17.5, 8);
  cb.rotateZ(Math.PI / 2);
  cb.translate(0, 4.8, 0);
  const merged = mergeGeometries([lp, rp, cb], false);
  lp.dispose();
  rp.dispose();
  cb.dispose();
  return merged;
})();

const startGateLanternsGeo = (() => {
  const ls = new THREE.SphereGeometry(0.35, 12, 12);
  ls.translate(-7.5, 3.8, 0);
  const rs = new THREE.SphereGeometry(0.35, 12, 12);
  rs.translate(7.5, 3.8, 0);
  const merged = mergeGeometries([ls, rs], false);
  ls.dispose();
  rs.dispose();
  return merged;
})();

const startBannerGeo = new THREE.PlaneGeometry(5, 1);

const checkpointGateFrameGeo = (() => {
  const lp = new THREE.CylinderGeometry(0.28, 0.32, 5, 8);
  lp.translate(-8.5, 2.5, 0);
  const rp = new THREE.CylinderGeometry(0.28, 0.32, 5, 8);
  rp.translate(8.5, 2.5, 0);
  const cb = new THREE.CylinderGeometry(0.22, 0.22, 17.5, 8);
  cb.rotateZ(Math.PI / 2);
  cb.translate(0, 4.8, 0);
  const merged = mergeGeometries([lp, rp, cb], false);
  lp.dispose();
  rp.dispose();
  cb.dispose();
  return merged;
})();

const checkpointDotsGeo = (() => {
  const ls = new THREE.SphereGeometry(0.3, 12, 12);
  ls.translate(-7.5, 3.8, 0);
  const rs = new THREE.SphereGeometry(0.3, 12, 12);
  rs.translate(7.5, 3.8, 0);
  const merged = mergeGeometries([ls, rs], false);
  ls.dispose();
  rs.dispose();
  return merged;
})();

const checkpointRingGeoNext = new THREE.TorusGeometry(3.2, 0.22, 12, 32);
const checkpointRingGeoNormal = new THREE.TorusGeometry(3.2, 0.14, 12, 32);
const checkpointBannerGeo = new THREE.PlaneGeometry(4.2, 0.9);

const finishGateFrameGeo = (() => {
  const lp = new THREE.CylinderGeometry(0.3, 0.35, 5, 8);
  lp.translate(-8.5, 2.5, 0);
  const rp = new THREE.CylinderGeometry(0.3, 0.35, 5, 8);
  rp.translate(8.5, 2.5, 0);
  const cb = new THREE.CylinderGeometry(0.25, 0.25, 17.5, 8);
  cb.rotateZ(Math.PI / 2);
  cb.translate(0, 4.8, 0);
  const merged = mergeGeometries([lp, rp, cb], false);
  lp.dispose();
  rp.dispose();
  cb.dispose();
  return merged;
})();

const finishLanternsGeo = (() => {
  const ls = new THREE.SphereGeometry(0.35, 12, 12);
  ls.translate(-7.5, 3.8, 0);
  const rs = new THREE.SphereGeometry(0.35, 12, 12);
  rs.translate(7.5, 3.8, 0);
  const merged = mergeGeometries([ls, rs], false);
  ls.dispose();
  rs.dispose();
  return merged;
})();

const finishRingGeoNext = new THREE.TorusGeometry(3.4, 0.25, 12, 32);
const finishRingGeoNormal = new THREE.TorusGeometry(3.4, 0.16, 12, 32);
const finishBannerGeo = new THREE.PlaneGeometry(6.5, 1.1);

/**
 * Rustic wooden Start Gate
 */
function StartGate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Merged wooden arch frame (posts + crossbar) */}
      <mesh geometry={startGateFrameGeo}>
        <meshToonMaterial gradientMap={threeStepGradientMap} color="#78350f" />
      </mesh>

      {/* Merged festive red lanterns */}
      <mesh geometry={startGateLanternsGeo}>
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Start Banner */}
      <mesh position={[0, 4.2, 0]} geometry={startBannerGeo}>
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Visible Checkpoint Gate (Requirement 2)
 * Shows visible arch with floating target ring across the river.
 * When isNext is true, it displays highlighted glowing colors.
 */
function CheckpointGate({
  position,
  rotationY,
  isNext,
  isCompleted,
}: {
  index?: number;
  position: [number, number, number];
  rotationY: number;
  isNext: boolean;
  isCompleted: boolean;
}) {
  const postColor = isNext ? '#0284c7' : isCompleted ? '#166534' : '#475569';
  const ringColor = isNext ? '#38bdf8' : isCompleted ? '#22c55e' : '#64748b';
  const bannerColor = isNext ? '#0284c7' : isCompleted ? '#15803d' : '#334155';

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Merged arch frame (posts + crossbar) */}
      <mesh geometry={checkpointGateFrameGeo}>
        <meshToonMaterial gradientMap={threeStepGradientMap} color={postColor} />
      </mesh>

      {/* Floating Center Checkpoint Ring */}
      <mesh position={[0, 2.5, 0]} geometry={isNext ? checkpointRingGeoNext : checkpointRingGeoNormal}>
        <meshBasicMaterial color={ringColor} transparent opacity={isNext ? 0.95 : 0.6} />
      </mesh>

      {/* Floating Checkpoint Number Banner */}
      <mesh position={[0, 4.2, 0]} geometry={checkpointBannerGeo}>
        <meshBasicMaterial color={bannerColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Glow marker dots on the posts when next (merged 2 dots) */}
      {isNext && (
        <mesh geometry={checkpointDotsGeo}>
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      )}
    </group>
  );
}

/**
 * Finish Line Gate (Checkpoint 3)
 */
function FinishGate({
  position,
  rotationY,
  isNext,
  isCompleted,
}: {
  position: [number, number, number];
  rotationY: number;
  isNext: boolean;
  isCompleted: boolean;
}) {
  const finishPostColor = isNext ? '#d97706' : isCompleted ? '#166534' : '#1e293b';
  const finishBannerColor = isNext ? '#10b981' : isCompleted ? '#059669' : '#0f172a';

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Merged arch frame (posts + crossbar) */}
      <mesh geometry={finishGateFrameGeo}>
        <meshToonMaterial gradientMap={threeStepGradientMap} color={finishPostColor} />
      </mesh>

      {/* Floating Finish Ring */}
      <mesh position={[0, 2.5, 0]} geometry={isNext ? finishRingGeoNext : finishRingGeoNormal}>
        <meshBasicMaterial
          color={isNext ? '#fbbf24' : '#10b981'}
          transparent
          opacity={isNext ? 0.95 : 0.6}
        />
      </mesh>

      {/* Checkered style finish banner */}
      <mesh position={[0, 4.2, 0]} geometry={finishBannerGeo}>
        <meshBasicMaterial color={finishBannerColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Merged Finish Lanterns */}
      <mesh geometry={finishLanternsGeo}>
        <meshBasicMaterial color={isNext ? '#fbbf24' : '#10b981'} />
      </mesh>
    </group>
  );
}
