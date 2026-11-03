'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Track } from './tracks/types';
import { smoothCenterline } from './math';
import { GAME_CONSTANTS } from './constants';

interface RiverProps {
  track: Track;
}

export function River({ track }: RiverProps) {
  // Pre-calculate smoothed spline centerline points and meshes
  const { waterGeo, leftBankGeo, rightBankGeo } = useMemo(() => {
    const smoothed = smoothCenterline(track.centerline, 14);
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

    for (let i = 0; i < count; i++) {
      const curr = smoothed[i];
      const prev = smoothed[Math.max(0, i - 1)];
      const next = smoothed[Math.min(count - 1, i + 1)];

      // Tangent vector along centerline
      let dx = next[0] - prev[0];
      let dz = next[1] - prev[1];
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      dx /= len;
      dz /= len;

      // Normal perpendicular to tangent on X-Z plane
      // N = (-dz, dx) points to the left of the river's forward flow
      const nx = -dz;
      const nz = dx;

      // Left and right waterline vertices at y = 0
      const leftEdgeX = curr[0] + nx * halfWidth;
      const leftEdgeZ = curr[1] + nz * halfWidth;

      const rightEdgeX = curr[0] - nx * halfWidth;
      const rightEdgeZ = curr[1] - nz * halfWidth;

      // --- Water Ribbon ---
      waterPositions.push(leftEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, leftEdgeZ);
      waterPositions.push(rightEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, rightEdgeZ);
      const vCoord = i / (count - 1);
      waterUvs.push(0, vCoord, 1, vCoord);

      // --- Left Bank (Waterline -> Crest -> Outer Top) ---
      const leftCrestX = curr[0] + nx * (halfWidth + 1.2);
      const leftCrestZ = curr[1] + nz * (halfWidth + 1.2);
      const leftOuterX = curr[0] + nx * (halfWidth + bankWidth);
      const leftOuterZ = curr[1] + nz * (halfWidth + bankWidth);

      leftPositions.push(leftEdgeX, GAME_CONSTANTS.WATER_SURFACE_Y, leftEdgeZ); // Waterline
      leftPositions.push(leftCrestX, bankHeight, leftCrestZ); // Crest
      leftPositions.push(leftOuterX, bankHeight * 0.95, leftOuterZ); // Outer flat grass

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
      // Slope quad (Waterline to Crest)
      leftIndices.push(rowL, rowL + 1, rowL + 3);
      leftIndices.push(rowL + 1, rowL + 4, rowL + 3);
      // Top grass quad (Crest to Outer)
      leftIndices.push(rowL + 1, rowL + 2, rowL + 4);
      leftIndices.push(rowL + 2, rowL + 5, rowL + 4);

      const rowR = i * 3;
      // Slope quad (Waterline to Crest)
      rightIndices.push(rowR, rowR + 3, rowR + 1);
      rightIndices.push(rowR + 1, rowR + 3, rowR + 4);
      // Top grass quad (Crest to Outer)
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

    return { waterGeo: wGeo, leftBankGeo: lGeo, rightBankGeo: rGeo };
  }, [track]);

  return (
    <group>
      {/* 1. River Water Surface Ribbon */}
      <mesh geometry={waterGeo}>
        <meshToonMaterial
          color={GAME_CONSTANTS.WATER_SURFACE_COLOR}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Water river bed under the surface */}
      <mesh geometry={waterGeo} position={[0, -0.15, 0]}>
        <meshBasicMaterial color={GAME_CONSTANTS.WATER_COLOR} />
      </mesh>

      {/* 2. Raised River Banks (Lush green anime grass + stone slopes) */}
      <mesh geometry={leftBankGeo}>
        <meshToonMaterial color={GAME_CONSTANTS.BANK_TOP_COLOR} />
      </mesh>
      <mesh geometry={rightBankGeo}>
        <meshToonMaterial color={GAME_CONSTANTS.BANK_TOP_COLOR} />
      </mesh>

      {/* 3. Start Gate Arch (Rustic wooden posts + hanging lanterns) */}
      <StartGate position={[track.start.pos[0], 0, track.start.pos[1]]} />

      {/* 4. Finish Gate Arch at final checkpoint */}
      <FinishGate
        position={[
          track.checkpoints[track.checkpoints.length - 1].pos[0],
          0,
          track.checkpoints[track.checkpoints.length - 1].pos[1],
        ]}
      />
    </group>
  );
}

/**
 * Rustic wooden Start Gate with festive anime banners/lanterns
 */
function StartGate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left post */}
      <mesh position={[-8.5, 2.5, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 5, 8]} />
        <meshToonMaterial color="#78350f" />
      </mesh>
      {/* Right post */}
      <mesh position={[8.5, 2.5, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 5, 8]} />
        <meshToonMaterial color="#78350f" />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 4.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 17.5, 8]} />
        <meshToonMaterial color="#92400e" />
      </mesh>

      {/* Lanterns on left and right */}
      <mesh position={[-7.5, 3.8, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[7.5, 3.8, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Start Banner */}
      <mesh position={[0, 4.2, 0]}>
        <planeGeometry args={[5, 1]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Finish Line Gate
 */
function FinishGate({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left post */}
      <mesh position={[-8.5, 2.5, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 5, 8]} />
        <meshToonMaterial color="#1e293b" />
      </mesh>
      {/* Right post */}
      <mesh position={[8.5, 2.5, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 5, 8]} />
        <meshToonMaterial color="#1e293b" />
      </mesh>
      {/* Crossbar */}
      <mesh position={[0, 4.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 17.5, 8]} />
        <meshToonMaterial color="#0f172a" />
      </mesh>
      {/* Checkered style finish banner */}
      <mesh position={[0, 4.2, 0]}>
        <planeGeometry args={[6, 1]} />
        <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

