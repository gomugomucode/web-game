#!/usr/bin/env node

/**
 * Track Geometry & Curvature Verification Script
 * Validates all tracks in TRACK_REGISTRY for:
 * 1. Centerline length and race distance
 * 2. Minimum radius of curvature along smoothed centerline (>= 12m)
 * 3. Checkpoints inside river boundary
 * 4. Currents inside river boundary (including current width)
 * 5. Hazard rocks inside river boundary (including rock radius)
 * 6. Rival lane bounds (+-4.5m within river half-width)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper to transpile and load TS modules in-memory
function loadTsModule(relativePath) {
  const fullPath = path.resolve(projectRoot, relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = { exports: {} };
  const customRequire = (reqPath) => {
    if (reqPath.startsWith('.')) {
      const dir = path.dirname(fullPath);
      const target = path.resolve(dir, reqPath);
      for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
        if (fs.existsSync(target + ext)) {
          return loadTsModule(path.relative(projectRoot, target + ext));
        }
      }
    }
    // External packages or node built-ins
    return {
      // Mock THREE constants if needed
      NearestFilter: 1003,
      DoubleSide: 2,
    };
  };

  const context = vm.createContext({
    module: mod,
    exports: mod.exports,
    require: customRequire,
    console,
    Math,
  });

  vm.runInContext(transpiled, context);
  return mod.exports;
}

// Catmull-Rom smoothing matching src/game/math.ts
function smoothCenterline(points, subdivisions = 14) {
  if (points.length < 2) return points.map((p) => [p[0], p[1]]);
  const smoothed = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
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
  const last = points[points.length - 1];
  smoothed.push([last[0], last[1]]);
  return smoothed;
}

// Distance from point P to a polyline
function distToPolyline(px, pz, polyline) {
  let minD = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i][0];
    const az = polyline[i][1];
    const bx = polyline[i + 1][0];
    const bz = polyline[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    let t = 0;
    if (len2 > 1e-6) {
      t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
    }
    const projX = ax + t * dx;
    const projZ = az + t * dz;
    const d = Math.hypot(px - projX, pz - projZ);
    if (d < minD) minD = d;
  }
  return minD;
}

// Calculate minimum radius of curvature along smoothed centerline
function computeMinRadiusOfCurvature(smoothed) {
  let minR = Infinity;
  let minPoint = null;
  let minIndex = -1;

  for (let i = 1; i < smoothed.length - 1; i++) {
    const pA = smoothed[i - 1];
    const pB = smoothed[i];
    const pC = smoothed[i + 1];

    const a = Math.hypot(pB[0] - pC[0], pB[1] - pC[1]);
    const b = Math.hypot(pA[0] - pC[0], pA[1] - pC[1]);
    const c = Math.hypot(pA[0] - pB[0], pA[1] - pB[1]);

    // Cross product (2 * area)
    const cp = (pB[0] - pA[0]) * (pC[1] - pA[1]) - (pB[1] - pA[1]) * (pC[0] - pA[0]);
    if (Math.abs(cp) > 1e-7) {
      const radius = (a * b * c) / (2 * Math.abs(cp));
      if (radius < minR) {
        minR = radius;
        minPoint = pB;
        minIndex = i;
      }
    }
  }

  return { minR, minPoint, minIndex };
}

// Main verification runner
function main() {
  console.log('====================================================');
  console.log('       OTTER RUN - TRACK VERIFICATION SUITE         ');
  console.log('====================================================\n');

  const registryModule = loadTsModule('src/game/tracks/registry.ts');
  const trackList = registryModule.TRACK_LIST || [];

  if (!trackList || trackList.length === 0) {
    console.error('ERROR: No tracks found in TRACK_REGISTRY!');
    process.exit(1);
  }

  console.log(`Found ${trackList.length} tracks registered: ${trackList.map((t) => t.id).join(', ')}\n`);

  let allPassed = true;
  const summaryReport = [];

  for (const track of trackList) {
    console.log(`----------------------------------------------------`);
    console.log(`VERIFYING TRACK: [${track.id}] - ${track.name}`);
    console.log(`----------------------------------------------------`);

    let trackPass = true;
    const riverWidth = track.width || 18;
    const halfWidth = riverWidth * 0.5;
    const smoothed = track.smoothedCenterline || smoothCenterline(track.centerline, 14);

    // 1. Centerline length & Race Distance
    let totalLength = 0;
    const cumDist = [0];
    for (let i = 1; i < smoothed.length; i++) {
      const d = Math.hypot(
        smoothed[i][0] - smoothed[i - 1][0],
        smoothed[i][1] - smoothed[i - 1][1]
      );
      totalLength += d;
      cumDist.push(totalLength);
    }

    // Distance between start gate and finish gate
    const startPos = track.start?.pos || [0, 0];
    const finishCp = track.checkpoints[track.checkpoints.length - 1];
    const finishPos = finishCp?.pos || [0, 0];

    // Find nearest s on smoothed centerline for start and finish
    function getS(pos) {
      let minD = Infinity;
      let bestS = 0;
      for (let i = 0; i < smoothed.length - 1; i++) {
        const ax = smoothed[i][0];
        const az = smoothed[i][1];
        const bx = smoothed[i + 1][0];
        const bz = smoothed[i + 1][1];
        const dx = bx - ax;
        const dz = bz - az;
        const len2 = dx * dx + dz * dz;
        let t = 0;
        if (len2 > 1e-6) {
          t = Math.max(0, Math.min(1, ((pos[0] - ax) * dx + (pos[1] - az) * dz) / len2));
        }
        const px = ax + t * dx;
        const pz = az + t * dz;
        const d = Math.hypot(pos[0] - px, pos[1] - pz);
        if (d < minD) {
          minD = d;
          bestS = cumDist[i] + t * Math.sqrt(len2);
        }
      }
      return bestS;
    }

    const sStart = getS(startPos);
    const sFinish = getS(finishPos);
    const raceDistance = Math.abs(sFinish - sStart);

    console.log(`Centerline total length: ${totalLength.toFixed(1)} m`);
    console.log(`Race distance (Start -> Finish): ${raceDistance.toFixed(1)} m`);

    if (track.id === 'river-03') {
      if (raceDistance < 450 || raceDistance > 550) {
        console.error(`  [FAIL] River03 race distance ${raceDistance.toFixed(1)} m must be in [450m, 550m]`);
        trackPass = false;
      } else {
        console.log(`  [PASS] River03 length within target [450m, 550m]`);
      }
    }

    // 2. Minimum Radius of Curvature (must be >= 12m)
    const { minR, minPoint, minIndex } = computeMinRadiusOfCurvature(smoothed);
    const minS = cumDist[minIndex] || 0;
    console.log(`\nCurvature Analysis:`);
    console.log(
      `  Min Radius of Curvature: ${minR.toFixed(2)} m at [X: ${minPoint[0].toFixed(1)}, Z: ${minPoint[1].toFixed(1)}] (s = ${minS.toFixed(1)} m)`
    );

    if (minR < 12.0) {
      console.error(
        `  [FAIL] Minimum radius of curvature ${minR.toFixed(2)} m is less than 12.0 m requirement!`
      );
      trackPass = false;
    } else {
      console.log(`  [PASS] Minimum radius of curvature >= 12.0 m (River half-width = ${halfWidth} m)`);
    }

    // 3. Checkpoints inside river
    console.log(`\nCheckpoints Analysis (${track.checkpoints.length} checkpoints):`);
    track.checkpoints.forEach((cp, idx) => {
      const d = distToPolyline(cp.pos[0], cp.pos[1], smoothed);
      const ok = d <= halfWidth;
      if (!ok) {
        console.error(
          `  [FAIL] Checkpoint ${idx + 1} at [${cp.pos[0]}, ${cp.pos[1]}] is ${d.toFixed(2)} m from centerline (exceeds ${halfWidth} m)`
        );
        trackPass = false;
      }
    });
    if (trackPass) {
      console.log(`  [PASS] All ${track.checkpoints.length} checkpoints strictly within river bounds`);
    }

    // 4. Currents inside river
    console.log(`\nCurrents Analysis (${track.currents.length} currents):`);
    track.currents.forEach((c) => {
      const currentSmoothed = c.smoothedPoints || smoothCenterline(c.points, 12);
      let maxDist = 0;
      for (const p of currentSmoothed) {
        const d = distToPolyline(p[0], p[1], smoothed);
        if (d > maxDist) maxDist = d;
      }
      const outerEdge = maxDist + c.width * 0.5;
      const ok = outerEdge <= halfWidth;
      console.log(
        `  Current ${c.id}: strength = ${c.strength}, width = ${c.width}m, corridor max edge = ${outerEdge.toFixed(2)} m (<= ${halfWidth} m)`
      );
      if (!ok) {
        console.error(`  [FAIL] Current ${c.id} corridor exceeds river bank bounds!`);
        trackPass = false;
      }
    });

    if (track.id === 'river-03') {
      const lastCurrent = track.currents[track.currents.length - 1];
      const maxOtherStrength = Math.max(...track.currents.slice(0, -1).map((c) => c.strength));
      if (lastCurrent.strength <= maxOtherStrength) {
        console.error(
          `  [FAIL] Last current (${lastCurrent.id}) strength ${lastCurrent.strength} is not the strongest!`
        );
        trackPass = false;
      } else {
        console.log(`  [PASS] Last current is strongest in final third (strength = ${lastCurrent.strength})`);
      }
    }

    // 5. Hazard rocks inside river
    console.log(`\nHazards Analysis (${track.hazards.length} rocks):`);
    track.hazards.forEach((h) => {
      const d = distToPolyline(h.pos[0], h.pos[1], smoothed);
      const outerEdge = d + h.radius;
      if (outerEdge >= halfWidth) {
        console.error(
          `  [FAIL] Hazard ${h.id} at [${h.pos[0]}, ${h.pos[1]}] outer edge ${outerEdge.toFixed(2)} m exceeds bank ${halfWidth} m`
        );
        trackPass = false;
      }
    });

    if (track.id === 'river-03' && track.hazards.length < 12) {
      console.error(`  [FAIL] River03 must have at least 12 hazard rocks (found ${track.hazards.length})`);
      trackPass = false;
    } else {
      console.log(`  [PASS] All ${track.hazards.length} hazard rocks strictly within river bounds with clearance`);
    }

    // 6. Rival Lanes
    const rivalLanes = track.rivalLanes || [-4.5, -2.5, 0, 2.5, 4.5];
    const maxLaneOffset = Math.max(...rivalLanes.map((l) => Math.abs(l)));
    if (maxLaneOffset > halfWidth) {
      console.error(`  [FAIL] Rival lane offset ${maxLaneOffset} m exceeds river half-width ${halfWidth} m`);
      trackPass = false;
    } else {
      console.log(`  [PASS] All rival lanes (max offset ${maxLaneOffset} m) within river half-width`);
    }

    summaryReport.push({
      id: track.id,
      name: track.name,
      raceDistance: `${raceDistance.toFixed(1)} m`,
      minRadius: `${minR.toFixed(2)} m at [${minPoint[0].toFixed(1)}, ${minPoint[1].toFixed(1)}]`,
      status: trackPass ? 'PASS' : 'FAIL',
    });

    if (!trackPass) allPassed = false;
    console.log('');
  }

  console.log('====================================================');
  console.log('                VERIFICATION SUMMARY                ');
  console.log('====================================================');
  console.table(summaryReport);

  if (!allPassed) {
    console.error('\n>>> OVERALL RESULT: VERIFICATION FAILED! <<<\n');
    process.exit(1);
  } else {
    console.log('\n>>> OVERALL RESULT: ALL TRACKS PASSED ALL CHECKS! <<<\n');
    process.exit(0);
  }
}

main();

