'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GAME_CONSTANTS } from './constants';
import { sharedOtterRefs } from './sharedRefs';
import { useGameStore } from './useGameStore';
import { threeStepGradientMap } from './toonGradient';
import { sharedWaterMaterial } from './WaterMaterial';

// Pre-computed static geometries created once at module load (Milestone 10)

/**
 * 1. Merged Wooden Docks (North Main Pier, East Fishing Dock, West Mooring)
 * Includes walkways and support pilings in a single draw call.
 */
const mergedDocksGeo = (() => {
  const parts: THREE.BufferGeometry[] = [];

  // Helper to add cylindrical wooden pilings
  function addPiling(x: number, z: number) {
    const cyl = new THREE.CylinderGeometry(0.2, 0.22, 2.2, 8);
    cyl.translate(x, -0.6, z);
    parts.push(cyl);
  }

  // Dock 1: North Pier where Barnaby stands (Walkway length 11m, width 3.2m, z: 18 -> 7)
  const walk1 = new THREE.BoxGeometry(3.2, 0.25, 11);
  walk1.translate(0, 0.35, 12.5);
  parts.push(walk1);

  [8, 11, 14, 17].forEach((z) => {
    addPiling(-1.4, z);
    addPiling(1.4, z);
  });

  // Dock 2: East Fishing Dock (Walkway length 10m, width 2.2m, x: 22 -> 12 at z = -3)
  const walk2 = new THREE.BoxGeometry(10, 0.25, 2.2);
  walk2.translate(17, 0.35, -3);
  parts.push(walk2);

  [13, 16.5, 20].forEach((x) => {
    addPiling(x, -3 - 0.9);
    addPiling(x, -3 + 0.9);
  });

  // Dock 3: West Mooring (Walkway length 9m, width 2.2m, x: -20 -> -11 at z = -8)
  const walk3 = new THREE.BoxGeometry(9, 0.25, 2.2);
  walk3.translate(-15.5, 0.35, -8);
  parts.push(walk3);

  [-12, -15.5, -19].forEach((x) => {
    addPiling(x, -8 - 0.9);
    addPiling(x, -8 + 0.9);
  });

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
})();

/**
 * 2. Merged Marsh Reeds Clumps
 * Slender green stalks grouped near the shallows and island rock in a single draw call.
 */
const mergedReedsGeo = (() => {
  const parts: THREE.BufferGeometry[] = [];

  function addReed(x: number, z: number, height = 1.6, tilt = 0.1) {
    const cone = new THREE.CylinderGeometry(0.03, 0.08, height, 5);
    cone.rotateZ(tilt);
    cone.translate(x, height * 0.45, z);
    parts.push(cone);
  }

  // Clump 1: around reed island [-13, 7]
  const c1 = [-13, 7];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    addReed(c1[0] + Math.cos(angle) * 2.2, c1[1] + Math.sin(angle) * 2.2, 1.4 + (i % 3) * 0.2, (i % 2 === 0 ? 0.08 : -0.08));
  }

  // Clump 2: West shoreline [-24, -5]
  const c2 = [-24, -5];
  for (let i = 0; i < 6; i++) {
    addReed(c2[0] + (i - 2.5) * 0.6, c2[1] + Math.sin(i) * 0.5, 1.5 + (i % 2) * 0.3, 0.06);
  }

  // Clump 3: East shoreline [22, 7]
  const c3 = [22, 7];
  for (let i = 0; i < 6; i++) {
    addReed(c3[0] + (i - 2.5) * 0.6, c3[1] + Math.cos(i) * 0.5, 1.5 + (i % 2) * 0.3, -0.06);
  }

  // Clump 4: South shoreline [5, -25]
  const c4 = [5, -25];
  for (let i = 0; i < 6; i++) {
    addReed(c4[0] + (i - 2.5) * 0.7, c4[1] + Math.sin(i) * 0.4, 1.6 + (i % 2) * 0.2, 0.05);
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
})();

/**
 * 3. Elder Moss Character Model Geometries (Milestone 11)
 * Low-poly elder mentor otter sitting on the dock with his fishing rod.
 */
const elderMossBodyGeo = (() => {
  const parts: THREE.BufferGeometry[] = [];

  // Main body
  const body = new THREE.CylinderGeometry(0.35, 0.38, 1.0, 8);
  body.translate(0, 0.5, 0);
  parts.push(body);

  // Head
  const head = new THREE.SphereGeometry(0.32, 8, 8);
  head.translate(0, 1.1, 0);
  parts.push(head);

  // Snout (faces -Z towards open water and player)
  const snout = new THREE.BoxGeometry(0.24, 0.18, 0.28);
  snout.translate(0, 1.02, -0.28);
  parts.push(snout);

  // Nose tip
  const nose = new THREE.SphereGeometry(0.06, 6, 6);
  nose.translate(0, 1.08, -0.42);
  parts.push(nose);

  // Fishing rod extending over water
  const rod = new THREE.CylinderGeometry(0.03, 0.05, 2.5, 6);
  rod.rotateX(Math.PI / 4.5);
  rod.translate(0.35, 1.1, -1.0);
  parts.push(rod);

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
})();

// Elder Moss's distinctive moss-green mentor scarf (Milestone 11: distinct from rival Barnaby #059669)
const elderMossScarfGeo = (() => {
  const scarf = new THREE.CylinderGeometry(0.39, 0.41, 0.25, 8);
  scarf.translate(0, 0.88, 0);
  return scarf;
})();

// Floating Quest Marker above Barnaby's head
const questMarkerGeo = new THREE.OctahedronGeometry(0.28, 0);

// Pond Water Geometry (60m across, radius 30m)
const pondWaterGeo = new THREE.CircleGeometry(GAME_CONSTANTS.HUB_POND_RADIUS, 64);

// Grassy Pond Shore Ring Geometry
const pondShoreGeo = new THREE.RingGeometry(GAME_CONSTANTS.HUB_POND_RADIUS - 0.5, GAME_CONSTANTS.HUB_POND_RADIUS + 9.0, 64, 2);

/**
 * HubScene Component (Milestone 10)
 * Renders the calm pond area, docks, scenery rocks, reeds, and NPC Barnaby.
 */
export function HubScene() {
  const markerRef = useRef<THREE.Mesh>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);

  // 6 Scenery Rocks Placements around the pond
  const rockPlacements = useMemo(
    () => [
      { pos: [13, 0.4, 11] as const, scale: [2.6, 2.0, 2.6] as const, rot: 0.5 },    // Shoal obstacle
      { pos: [-13, 0.35, 7] as const, scale: [2.4, 1.8, 2.4] as const, rot: -0.7 },  // Island obstacle
      { pos: [8, 0.3, -9] as const, scale: [2.0, 1.5, 2.0] as const, rot: 1.1 },     // South lily cluster
      { pos: [-18, 0.3, -18] as const, scale: [1.8, 1.2, 1.6] as const, rot: 0.3 }, // South-west shallows
      { pos: [22, 0.35, 16] as const, scale: [2.2, 1.6, 2.0] as const, rot: -0.4 }, // North-east shallows
      { pos: [-22, 0.3, 14] as const, scale: [1.9, 1.3, 1.7] as const, rot: 0.8 },  // North-west shallows
    ],
    []
  );

  useEffect(() => {
    if (!rocksRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rockPlacements.length; i++) {
      const rock = rockPlacements[i];
      dummy.position.set(rock.pos[0], rock.pos[1], rock.pos[2]);
      dummy.rotation.set(0, rock.rot, 0);
      dummy.scale.set(rock.scale[0], rock.scale[1], rock.scale[2]);
      dummy.updateMatrix();
      rocksRef.current.setMatrixAt(i, dummy.matrix);
    }
    rocksRef.current.instanceMatrix.needsUpdate = true;
  }, [rockPlacements]);

  // Frame update for water shader, floating quest marker bobbing, and NPC distance check
  useFrame((_, delta) => {
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);

    // Animate water shader time uniform
    sharedWaterMaterial.uniforms.uTime.value += dt;

    // Animate floating quest marker
    if (markerRef.current) {
      const t = performance.now() * 0.001;
      markerRef.current.position.y = 2.4 + Math.sin(t * 3.5) * 0.12;
      markerRef.current.rotation.y = t * 1.8;
    }

    // Distance check to NPC Barnaby at [0, 9.5]
    const otterPos = sharedOtterRefs.position;
    const dx = otterPos.x - GAME_CONSTANTS.HUB_NPC_POS[0];
    const dz = otterPos.z - GAME_CONSTANTS.HUB_NPC_POS[1];
    const distSq = dx * dx + dz * dz;
    const isNear = distSq < GAME_CONSTANTS.HUB_NPC_INTERACT_RADIUS * GAME_CONSTANTS.HUB_NPC_INTERACT_RADIUS;

    const store = useGameStore.getState();
    if (store.isNearNpc !== isNear) {
      store.setIsNearNpc(isNear);
    }
  });

  return (
    <group>
      {/* 1. Pond Water Surface (Animated Shader, identical toon look as river) */}
      <mesh
        geometry={pondWaterGeo}
        material={sharedWaterMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      />

      {/* 2. Grassy Pond Shore Perimeter Ring */}
      <mesh
        geometry={pondShoreGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color={GAME_CONSTANTS.BANK_TOP_COLOR}
        />
      </mesh>

      {/* 3. Merged Wooden Docks (3 docks in 1 mesh) */}
      <mesh geometry={mergedDocksGeo}>
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color="#78350f"
        />
      </mesh>

      {/* 4. Instanced Pond Scenery Rocks (6 rocks in 1 mesh) */}
      <instancedMesh
        ref={rocksRef}
        args={[undefined, undefined, rockPlacements.length]}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color="#64748b"
        />
      </instancedMesh>

      {/* 5. Merged Marsh Reeds (1 mesh) */}
      <mesh geometry={mergedReedsGeo}>
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color="#65a30d"
        />
      </mesh>

      {/* 6. NPC Elder Moss Figure on North Dock */}
      <group position={[GAME_CONSTANTS.HUB_NPC_POS[0], 0.48, GAME_CONSTANTS.HUB_NPC_POS[1]]}>
        {/* Main Body + Head + Snout + Fishing Rod */}
        <mesh geometry={elderMossBodyGeo}>
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#8d5b34"
          />
        </mesh>

        {/* Moss Green Mentor Scarf (Milestone 11: distinct from Barnaby #059669) */}
        <mesh geometry={elderMossScarfGeo}>
          <meshToonMaterial
            gradientMap={threeStepGradientMap}
            color="#84cc16"
          />
        </mesh>

        {/* Floating Animated Quest Marker */}
        <mesh
          ref={markerRef}
          geometry={questMarkerGeo}
          position={[0, 2.4, 0]}
          renderOrder={3}
        >
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
      </group>
    </group>
  );
}

