import { Vec2 } from './tracks/types';

export interface NearestPolylineResult {
  point: [number, number];
  distance: number;
  segmentIndex: number;
  outwardX: number; // Unit vector pointing from centerline to sample point P
  outwardZ: number;
  tangentX: number; // Unit vector along the centerline segment
  tangentZ: number;
}

// Reusable result container to avoid allocations inside the frame loop
const sharedPolylineResult: NearestPolylineResult = {
  point: [0, 0],
  distance: 0,
  segmentIndex: 0,
  outwardX: 0,
  outwardZ: 0,
  tangentX: 0,
  tangentZ: 0,
};

export const clamp = (val: number, min: number, max: number): number =>
  Math.min(Math.max(val, min), max);

/**
 * Finds the nearest point on a 2D polyline to point P(px, pz).
 * Reuses an internal result object to guarantee ZERO allocations in useFrame.
 */
export function findNearestPointOnPolyline(
  px: number,
  pz: number,
  polyline: readonly Vec2[]
): NearestPolylineResult {
  let minDistanceSq = Infinity;
  let bestX = polyline[0][0];
  let bestZ = polyline[0][1];
  let bestSegmentIndex = 0;
  let bestTangentX = 0;
  let bestTangentZ = 1;

  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i][0];
    const az = polyline[i][1];
    const bx = polyline[i + 1][0];
    const bz = polyline[i + 1][1];

    const segDx = bx - ax;
    const segDz = bz - az;
    const segLengthSq = segDx * segDx + segDz * segDz;

    let t = 0;
    if (segLengthSq > 0.000001) {
      t = ((px - ax) * segDx + (pz - az) * segDz) / segLengthSq;
      t = clamp(t, 0, 1);
    }

    const projX = ax + t * segDx;
    const projZ = az + t * segDz;

    const dx = px - projX;
    const dz = pz - projZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestX = projX;
      bestZ = projZ;
      bestSegmentIndex = i;

      const segLen = Math.sqrt(segLengthSq);
      if (segLen > 0.0001) {
        bestTangentX = segDx / segLen;
        bestTangentZ = segDz / segLen;
      }
    }
  }

  const distance = Math.sqrt(minDistanceSq);
  let outwardX = 0;
  let outwardZ = 0;
  if (distance > 0.00001) {
    outwardX = (px - bestX) / distance;
    outwardZ = (pz - bestZ) / distance;
  } else {
    // If exactly on centerline, use normal to tangent
    outwardX = -bestTangentZ;
    outwardZ = bestTangentX;
  }

  sharedPolylineResult.point[0] = bestX;
  sharedPolylineResult.point[1] = bestZ;
  sharedPolylineResult.distance = distance;
  sharedPolylineResult.segmentIndex = bestSegmentIndex;
  sharedPolylineResult.outwardX = outwardX;
  sharedPolylineResult.outwardZ = outwardZ;
  sharedPolylineResult.tangentX = bestTangentX;
  sharedPolylineResult.tangentZ = bestTangentZ;

  return sharedPolylineResult;
}

/**
 * Subdivides a coarse polyline using Catmull-Rom interpolation
 * to create smooth curves for ribbon mesh generation.
 */
export function smoothCenterline(
  points: readonly Vec2[],
  subdivisions: number = 20
): Vec2[] {
  if (points.length < 2) return [...points];

  const smoothed: Vec2[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const steps = i === points.length - 2 ? subdivisions + 1 : subdivisions;

    for (let s = 0; s < steps; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom formula
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);

      const z =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      smoothed.push([x, z]);
    }
  }

  return smoothed;
}
