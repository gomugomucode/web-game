import * as THREE from 'three';
import { findNearestPointOnPolyline } from './math';
import { GAME_CONSTANTS } from './constants';

/**
 * Common Boundary Collision Interface (Milestone 10)
 * Both River and Hub boundaries implement this interface.
 * Zero heap allocations during resolveCollision.
 */
export interface CollisionBoundary {
  resolveCollision(pos: THREE.Vector3, v: THREE.Vector3): void;
}

/**
 * River Boundary
 * Clamps distance from the smoothed river centerline to (halfWidth - boundaryRadius)
 * and scales outward velocity by boundarySpeedMultiplier (0.7).
 */
export class RiverBoundary implements CollisionBoundary {
  private centerline: [number, number][];
  private maxAllowedDist: number;

  constructor(centerline: [number, number][], halfWidth: number) {
    this.centerline = centerline;
    this.maxAllowedDist = halfWidth - GAME_CONSTANTS.BOUNDARY_COLLISION_RADIUS;
  }

  setTrack(centerline: [number, number][], halfWidth: number): void {
    this.centerline = centerline;
    this.maxAllowedDist = halfWidth - GAME_CONSTANTS.BOUNDARY_COLLISION_RADIUS;
  }

  resolveCollision(pos: THREE.Vector3, v: THREE.Vector3): void {
    const nearest = findNearestPointOnPolyline(pos.x, pos.z, this.centerline);

    if (nearest.distance > this.maxAllowedDist) {
      // Move the otter back to the bank boundary edge
      pos.x = nearest.point[0] + nearest.outwardX * this.maxAllowedDist;
      pos.z = nearest.point[1] + nearest.outwardZ * this.maxAllowedDist;

      // Outward component of velocity into the bank
      const outwardVel = v.x * nearest.outwardX + v.z * nearest.outwardZ;
      if (outwardVel > 0) {
        v.x -= outwardVel * nearest.outwardX;
        v.z -= outwardVel * nearest.outwardZ;

        // Multiply speed by 0.7 per Section 6.2
        v.x *= GAME_CONSTANTS.BOUNDARY_SPEED_MULTIPLIER;
        v.z *= GAME_CONSTANTS.BOUNDARY_SPEED_MULTIPLIER;
      }
    }
  }
}

export interface CircularObstacle {
  x: number;
  z: number;
  radius: number;
}

/**
 * Hub Boundary
 * Circle boundary (outer pond perimeter) plus 3 to 4 circular obstacles.
 * Zero heap allocations in resolveCollision.
 */
export class HubBoundary implements CollisionBoundary {
  private centerX: number;
  private centerZ: number;
  private maxRadius: number;
  private obstacles: CircularObstacle[];

  constructor(
    centerX: number,
    centerZ: number,
    radius: number,
    obstacles: CircularObstacle[]
  ) {
    this.centerX = centerX;
    this.centerZ = centerZ;
    this.maxRadius = radius - GAME_CONSTANTS.BOUNDARY_COLLISION_RADIUS;
    this.obstacles = obstacles;
  }

  resolveCollision(pos: THREE.Vector3, v: THREE.Vector3): void {
    // 1. Outer circular pond perimeter
    const dx = pos.x - this.centerX;
    const dz = pos.z - this.centerZ;
    const distSq = dx * dx + dz * dz;

    if (distSq > this.maxRadius * this.maxRadius) {
      const dist = Math.sqrt(distSq);
      const nx = dist > 0.0001 ? dx / dist : 0;
      const nz = dist > 0.0001 ? dz / dist : 1;

      pos.x = this.centerX + nx * this.maxRadius;
      pos.z = this.centerZ + nz * this.maxRadius;

      const outwardVel = v.x * nx + v.z * nz;
      if (outwardVel > 0) {
        v.x -= outwardVel * nx;
        v.z -= outwardVel * nz;
        v.x *= GAME_CONSTANTS.BOUNDARY_SPEED_MULTIPLIER;
        v.z *= GAME_CONSTANTS.BOUNDARY_SPEED_MULTIPLIER;
      }
    }

    // 2. Circular obstacles inside the pond
    const otterRad = GAME_CONSTANTS.OTTER_RADIUS;
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const totalRad = obs.radius + otterRad;
      const odx = pos.x - obs.x;
      const odz = pos.z - obs.z;
      const odistSq = odx * odx + odz * odz;

      if (odistSq < totalRad * totalRad) {
        const odist = Math.sqrt(odistSq);
        const onx = odist > 0.0001 ? odx / odist : 0;
        const onz = odist > 0.0001 ? odz / odist : 1;

        pos.x = obs.x + onx * totalRad;
        pos.z = obs.z + onz * totalRad;

        const inwardVel = v.x * onx + v.z * onz;
        if (inwardVel < 0) {
          v.x -= inwardVel * onx;
          v.z -= inwardVel * onz;
          v.x *= GAME_CONSTANTS.BOUNDARY_SPEED_MULTIPLIER;
          v.z *= GAME_CONSTANTS.BOUNDARY_SPEED_MULTIPLIER;
        }
      }
    }
  }
}

/** Default circular obstacles for the Hub pond scene */
export const HUB_OBSTACLES: CircularObstacle[] = [
  { x: 0, z: 9.5, radius: 1.8 }, // Main Dock pilings cluster
  { x: 13, z: 11, radius: 2.6 }, // Big Boulder Shoal
  { x: -13, z: 7, radius: 2.4 }, // Reed Island
  { x: 8, z: -9, radius: 2.0 },  // South Lily Rock Cluster
];

