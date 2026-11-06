'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { threeStepGradientMap } from './toonGradient';

interface Particle {
  x: number;
  y: number;
  z: number;
  speed: number;
  rotSpeed: number;
  phase: number;
}

const PARTICLE_COUNT = 40;

// Deterministic particle generation outside component render to maintain React 19 purity
function createInitialParticles(): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const s1 = ((i * 9301 + 49297) % 233280) / 233280;
    const s2 = (((i + 13) * 9301 + 49297) % 233280) / 233280;
    const s3 = (((i + 29) * 9301 + 49297) % 233280) / 233280;

    list.push({
      x: (s1 - 0.1) * 160,
      y: 0.5 + s2 * 4.0,
      z: (s3 - 0.1) * 160,
      speed: 0.8 + s1 * 1.5,
      rotSpeed: 0.5 + s2 * 1.5,
      phase: s3 * Math.PI * 2,
    });
  }
  return list;
}

/**
 * Environment Component (Vision Document: Stylized Anime Nature Valley)
 * - Warm directional sunlight & ambient hemisphere sky
 * - Soft distance fog hiding world bounds
 * - Surrounding rolling green valley terrain
 * - Clusters of low-poly river rocks and reeds
 * - Floating anime cherry blossom / leaf particles drifting on the river breeze
 */
export function Environment() {
  return (
    <group>
      {/* 1. Distance Atmospheric Fog */}
      <fog
        attach="fog"
        args={[
          GAME_CONSTANTS.FOG_COLOR,
          GAME_CONSTANTS.FOG_NEAR,
          GAME_CONSTANTS.FOG_FAR,
        ]}
      />

      {/* 2. Soft Sky Color */}
      <color attach="background" args={[GAME_CONSTANTS.SKY_COLOR]} />

      {/* 3. Genshin-Style Warm Lighting */}
      <hemisphereLight
        color="#e0f2fe"
        groundColor="#15803d"
        intensity={0.95}
      />
      <directionalLight
        position={[60, 80, -40]}
        intensity={1.35}
        color="#fffbeb"
      />

      {/* 4. Surrounding Valley Ground Plane (lowered below water surface and riverbed to prevent z-fighting/occlusion) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[75, -0.25, 70]}
      >
        <planeGeometry args={[600, 600]} />
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color={GAME_CONSTANTS.GROUND_VALLEY_COLOR}
        />
      </mesh>

      {/* 5. Natural River Elements: Rocks and Scenery */}
      <SceneryElements />

      {/* 6. Floating Breeze Leaves / Petals */}
      <FloatingPetals />
    </group>
  );
}

/**
 * Low-poly river rocks scattered along the river valley
 */
function SceneryElements() {
  const rockPlacements = useMemo(
    () => [
      { pos: [14, 0.4, 25], scale: [1.8, 1.2, 1.5], rot: 0.4 },
      { pos: [-15, 0.3, 40], scale: [1.4, 0.9, 1.2], rot: -0.6 },
      { pos: [38, 0.5, 125], scale: [2.2, 1.4, 1.8], rot: 1.2 },
      { pos: [10, 0.3, 90], scale: [1.5, 1.0, 1.4], rot: -0.2 },
      { pos: [65, 0.6, 155], scale: [2.8, 1.6, 2.2], rot: 0.8 },
      { pos: [125, 0.5, 155], scale: [2.0, 1.3, 1.7], rot: 0.3 },
      { pos: [165, 0.4, 95], scale: [2.5, 1.5, 2.0], rot: -0.5 },
      { pos: [135, 0.3, 60], scale: [1.6, 1.1, 1.3], rot: 0.9 },
      { pos: [136, 0.4, 15], scale: [2.0, 1.2, 1.6], rot: 0.2 },
      { pos: [105, 0.3, -8], scale: [1.8, 1.1, 1.4], rot: -0.4 },
    ],
    []
  );

  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rockPlacements.length; i++) {
      const rock = rockPlacements[i];
      dummy.position.set(rock.pos[0], rock.pos[1], rock.pos[2]);
      dummy.rotation.set(0, rock.rot, 0);
      dummy.scale.set(rock.scale[0], rock.scale[1], rock.scale[2]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [rockPlacements]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, rockPlacements.length]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshToonMaterial
        gradientMap={threeStepGradientMap}
        color="#64748b"
      />
    </instancedMesh>
  );
}

/**
 * Floating leaves/petals drifting across the river
 */
function FloatingPetals() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<Particle[]>(createInitialParticles());
  const dummyRef = useRef<THREE.Object3D>(new THREE.Object3D());

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const dt = Math.min(delta, 0.05);
    const particles = particlesRef.current;
    const dummy = dummyRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      p.x += Math.sin(p.phase) * dt * 0.5;
      p.z += p.speed * dt * 1.2;
      p.phase += dt * p.rotSpeed;

      // Wrap around bounding corridor
      if (p.z > 170) p.z = -20;
      if (p.x > 180) p.x = -20;

      dummy.position.set(p.x, p.y + Math.sin(p.phase) * 0.2, p.z);
      dummy.rotation.set(p.phase, p.phase * 0.5, p.phase * 0.8);
      dummy.scale.set(0.2, 0.05, 0.3);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#86efac" transparent opacity={0.8} />
    </instancedMesh>
  );
}
