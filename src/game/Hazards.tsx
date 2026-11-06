'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Track } from './tracks/types';
import { GAME_CONSTANTS } from './constants';
import { threeStepGradientMap } from './toonGradient';

interface HazardsProps {
  track: Track;
}

/**
 * Hazards Component (Milestone 9: InstancedMesh Optimization)
 * Uses 3 InstancedMeshes (rocks, warning rings, beacon cones) instead of 24 separate meshes.
 * Visual look, positions, and render order remain identical.
 */
export function Hazards({ track }: HazardsProps) {
  const hazards = useMemo(() => track.hazards || [], [track.hazards]);
  const count = hazards.length;

  const rocksMeshRef = useRef<THREE.InstancedMesh>(null);
  const ringsMeshRef = useRef<THREE.InstancedMesh>(null);
  const beaconsMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!rocksMeshRef.current || !ringsMeshRef.current || !beaconsMeshRef.current || count === 0) {
      return;
    }

    const dummy = new THREE.Object3D();

    // 1. Setup Rocks InstancedMesh
    for (let i = 0; i < count; i++) {
      const rock = hazards[i];
      dummy.position.set(rock.pos[0], rock.radius * 0.45, rock.pos[1]);
      dummy.rotation.set(0.4, 0.8, 0.2);
      dummy.scale.set(rock.radius, rock.radius, rock.radius);
      dummy.updateMatrix();
      rocksMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    rocksMeshRef.current.instanceMatrix.needsUpdate = true;

    // 2. Setup Water Surface Warning Rings InstancedMesh (renderOrder: 3, depthWrite: false)
    for (let i = 0; i < count; i++) {
      const rock = hazards[i];
      dummy.position.set(rock.pos[0], GAME_CONSTANTS.WATER_SURFACE_Y + 0.02, rock.pos[1]);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(rock.radius * 1.15, rock.radius * 1.15, rock.radius * 1.15);
      dummy.updateMatrix();
      ringsMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    ringsMeshRef.current.instanceMatrix.needsUpdate = true;

    // 3. Setup Beacon Cones InstancedMesh
    for (let i = 0; i < count; i++) {
      const rock = hazards[i];
      dummy.position.set(rock.pos[0], rock.radius * 1.35, rock.pos[1]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      beaconsMeshRef.current.setMatrixAt(i, dummy.matrix);
    }
    beaconsMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [hazards, count]);

  if (count === 0) return null;

  return (
    <group>
      {/* 1. Instanced Jagged Hazard Rocks */}
      <instancedMesh
        ref={rocksMeshRef}
        args={[undefined, undefined, count]}
      >
        <dodecahedronGeometry args={[1, 1]} />
        <meshToonMaterial
          gradientMap={threeStepGradientMap}
          color={GAME_CONSTANTS.HAZARD_ROCK_COLOR}
        />
      </instancedMesh>

      {/* 2. Instanced Floating Warning Rings on Water Surface */}
      <instancedMesh
        ref={ringsMeshRef}
        args={[undefined, undefined, count]}
        renderOrder={3}
      >
        <torusGeometry args={[1, 0.08 / 1.38, 12, 32]} />
        <meshBasicMaterial
          color={GAME_CONSTANTS.HAZARD_RING_COLOR}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </instancedMesh>

      {/* 3. Instanced Warning Beacon Cones */}
      <instancedMesh
        ref={beaconsMeshRef}
        args={[undefined, undefined, count]}
      >
        <coneGeometry args={[0.22, 0.5, 6]} />
        <meshBasicMaterial color={GAME_CONSTANTS.HAZARD_RING_COLOR} />
      </instancedMesh>
    </group>
  );
}
