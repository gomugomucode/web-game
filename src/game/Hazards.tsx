'use client';

import React from 'react';
import * as THREE from 'three';
import { Track } from './tracks/types';
import { GAME_CONSTANTS } from './constants';

interface HazardsProps {
  track: Track;
}

/**
 * Hazards Component (Milestone 7, Task B)
 * Renders dangerous obstacle rocks near strong currents.
 * Distinct from decorative rocks:
 * - Dark jagged obsidian color (#1e293b)
 * - Amber glowing hazard warning ring floating on the water surface around the rock base
 * - Amber warning beacon at the rock peak
 */
export function Hazards({ track }: HazardsProps) {
  const hazards = track.hazards || [];

  return (
    <group>
      {hazards.map((rock) => (
        <group
          key={rock.id}
          position={[rock.pos[0], 0, rock.pos[1]]}
        >
          {/* Main jagged hazard rock (dark obsidian stone) */}
          <mesh position={[0, rock.radius * 0.45, 0]} rotation={[0.4, 0.8, 0.2]}>
            <dodecahedronGeometry args={[rock.radius, 1]} />
            <meshToonMaterial
              color={GAME_CONSTANTS.HAZARD_ROCK_COLOR}
            />
          </mesh>

          {/* Floating warning marker ring on the water surface around the rock */}
          <mesh
            position={[0, GAME_CONSTANTS.WATER_SURFACE_Y + 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            renderOrder={3}
          >
            <torusGeometry args={[rock.radius * 1.15, 0.08, 12, 32]} />
            <meshBasicMaterial
              color={GAME_CONSTANTS.HAZARD_RING_COLOR}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Small warning beacon point on top of the rock */}
          <mesh position={[0, rock.radius * 1.35, 0]}>
            <coneGeometry args={[0.22, 0.5, 6]} />
            <meshBasicMaterial color={GAME_CONSTANTS.HAZARD_RING_COLOR} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
