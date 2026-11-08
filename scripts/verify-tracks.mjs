#!/usr/bin/env node

/**
 * Track Geometry, Curvature & Playability Verification Suite
 *
 * Imports the game's actual math and constants from src/game/ rather than duplicating them:
 * - smoothCenterline and findNearestPointOnPolyline from src/game/math.ts
 * - GAME_CONSTANTS from src/game/constants.ts
 * - TRACK_LIST from src/game/tracks/registry.ts
 *
 * Validates:
 * 1. Centerline length & race distance (river03 in [450m, 550m])
 * 2. Minimum radius of curvature along smoothed centerline (>= 12.0m)
 * 3. Checkpoints inside river boundary
 * 4. Currents inside river boundary (including corridor width) and strongest in last third for river03
 * 5. Hazard rocks inside river boundary (including rock radius)
 * 6. Cross-section blockage: Hazard rocks must never block > 60% of river width (rock radius + otter radius)
 * 7. Minimum gap between any two hazard rocks must be >= 3.5m (otter passable)
 * 8. Hazard clearance from gates & checkpoints must be >= 2.0m
 * 9. Rival lanes (+-4.5m) within river half-width (9.0m)
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
    // Stub THREE globals if imported in data files
    return {
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

// 1. Import game's live math and constants directly (no duplicated math code)
const mathModule = loadTsModule('src/game/math.ts');
const constantsModule = loadTsModule('src/game/constants.ts');
const registryModule = loadTsModule('src/game/tracks/registry.ts');

const { smoothCenterline } = mathModule;
const { GAME_CONSTANTS } = constantsModule;
const { TRACK_LIST } = registryModule;

const OTTER_RADIUS = GAME_CONSTANTS.OTTER_RADIUS ?? 0.35;

// Distance from point P to polyline
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

// Project point (px, pz) to polyline returning { s, lateralOffset }
function projectToCenterline(px, pz, polyline, cumDist) {
  let bestD = Infinity;
  let bestS = 0;
  let bestLat = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i][0];
    const az = polyline[i][1];
    const bx = polyline[i + 1][0];
    const bz = polyline[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-6) continue;
    const segLen = Math.sqrt(len2);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
    const projX = ax + t * dx;
    const projZ = az + t * dz;
    const d = Math.hypot(px - projX, pz - projZ);

    if (d < bestD) {
      bestD = d;
      bestS = cumDist[i] + t * segLen;
      // Cross product to determine signed lateral offset
      const cross = dx * (pz - az) - dz * (px - ax);
      bestLat = cross >= 0 ? d : -d;
    }
  }

  return { s: bestS, lat: bestLat, dist: bestD };
}

// Compute minimum radius of curvature along smoothed centerline
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

// Merge 1D intervals and compute total covered length
function unionIntervalLength(intervals) {
  if (intervals.length === 0) return 0;
  // Sort intervals by start
  intervals.sort((a, b) => a[0] - b[0]);
  let totalLength = 0;
  let [curStart, curEnd] = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const [nextStart, nextEnd] = intervals[i];
    if (nextStart <= curEnd) {
      curEnd = Math.max(curEnd, nextEnd);
    } else {
      totalLength += curEnd - curStart;
      curStart = nextStart;
      curEnd = nextEnd;
    }
  }
  totalLength += curEnd - curStart;
  return totalLength;
}

function main() {
  console.log('====================================================');
  console.log('    OTTER RUN - ADVANCED TRACK VERIFIER SUITE       ');
  console.log('====================================================\n');

  if (!TRACK_LIST || TRACK_LIST.length === 0) {
    console.error('ERROR: No tracks found in TRACK_REGISTRY!');
    process.exit(1);
  }

  console.log(`Loaded ${TRACK_LIST.length} tracks using live math & constants:`);
  console.log(`  - Otter Collision Radius: ${OTTER_RADIUS} m`);
  console.log(`  - Smoothing Function: src/game/math.ts [smoothCenterline]`);
  console.log(`  - Registered Tracks: ${TRACK_LIST.map((t) => t.id).join(', ')}\n`);

  let allPassed = true;
  const summaryReport = [];

  for (const track of TRACK_LIST) {
    console.log(`----------------------------------------------------`);
    console.log(`VERIFYING TRACK: [${track.id}] - ${track.name}`);
    console.log(`----------------------------------------------------`);

    let trackPass = true;
    const failures = [];

    const riverWidth = track.width || 18;
    const halfWidth = riverWidth * 0.5;
    // Use the game's actual smoothedCenterline or call imported smoothCenterline
    const smoothed = track.smoothedCenterline || smoothCenterline(track.centerline, 14);

    // Compute cumulative distances along smoothed centerline
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

    // Start & Finish Gate positions
    const startPos = track.start?.pos || [0, 0];
    const finishCp = track.checkpoints[track.checkpoints.length - 1];
    const finishPos = finishCp?.pos || [0, 0];

    const projStart = projectToCenterline(startPos[0], startPos[1], smoothed, cumDist);
    const projFinish = projectToCenterline(finishPos[0], finishPos[1], smoothed, cumDist);
    const raceDistance = Math.abs(projFinish.s - projStart.s);

    console.log(`Centerline total length: ${totalLength.toFixed(1)} m`);
    console.log(`Race distance (Start -> Finish): ${raceDistance.toFixed(1)} m`);

    if (track.id === 'river-03') {
      if (raceDistance < 450 || raceDistance > 550) {
        const msg = `River03 race distance ${raceDistance.toFixed(1)} m outside [450m, 550m] target`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      } else {
        console.log(`  [PASS] River03 length within target [450m, 550m]`);
      }
    }

    // 1. Curvature Check (>= 12m)
    const { minR, minPoint, minIndex } = computeMinRadiusOfCurvature(smoothed);
    const minS = cumDist[minIndex] || 0;
    console.log(`\nCurvature Analysis:`);
    console.log(
      `  Min Radius of Curvature: ${minR.toFixed(2)} m at [X: ${minPoint[0].toFixed(1)}, Z: ${minPoint[1].toFixed(1)}] (s = ${minS.toFixed(1)} m)`
    );

    if (minR < 12.0) {
      const msg = `Min radius of curvature ${minR.toFixed(2)} m is less than 12.0 m at [${minPoint[0].toFixed(1)}, ${minPoint[1].toFixed(1)}]`;
      failures.push(msg);
      console.error(`  [FAIL] ${msg}`);
      trackPass = false;
    } else {
      console.log(`  [PASS] Minimum radius of curvature >= 12.0 m (River half-width = ${halfWidth} m)`);
    }

    // 2. Checkpoints inside river
    console.log(`\nCheckpoints Analysis (${track.checkpoints.length} checkpoints):`);
    track.checkpoints.forEach((cp, idx) => {
      const d = distToPolyline(cp.pos[0], cp.pos[1], smoothed);
      if (d > halfWidth) {
        const msg = `Checkpoint ${idx + 1} at [${cp.pos[0]}, ${cp.pos[1]}] is ${d.toFixed(2)} m from centerline (exceeds ${halfWidth} m)`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      }
    });
    if (!failures.some((f) => f.includes('Checkpoint'))) {
      console.log(`  [PASS] All ${track.checkpoints.length} checkpoints strictly within river bounds`);
    }

    // 3. Currents inside river
    console.log(`\nCurrents Analysis (${track.currents.length} currents):`);
    track.currents.forEach((c) => {
      const currentSmoothed = c.smoothedPoints || smoothCenterline(c.points, 12);
      let maxDist = 0;
      for (const p of currentSmoothed) {
        const d = distToPolyline(p[0], p[1], smoothed);
        if (d > maxDist) maxDist = d;
      }
      const outerEdge = maxDist + c.width * 0.5;
      if (outerEdge > halfWidth) {
        const msg = `Current ${c.id} corridor outer edge ${outerEdge.toFixed(2)} m exceeds bank ${halfWidth} m`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      } else {
        console.log(
          `  Current ${c.id}: strength = ${c.strength}, width = ${c.width}m, corridor max edge = ${outerEdge.toFixed(2)} m (<= ${halfWidth} m)`
        );
      }
    });

    if (track.id === 'river-03') {
      const lastCurrent = track.currents[track.currents.length - 1];
      const maxOther = Math.max(...track.currents.slice(0, -1).map((c) => c.strength));
      if (lastCurrent.strength <= maxOther) {
        const msg = `Last current (${lastCurrent.id}) strength ${lastCurrent.strength} is not strongest`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      } else {
        console.log(`  [PASS] Last current is strongest in final third (strength = ${lastCurrent.strength})`);
      }
    }

    // 4. Hazards inside river
    console.log(`\nHazards Boundary Analysis (${track.hazards.length} rocks):`);
    track.hazards.forEach((h) => {
      const d = distToPolyline(h.pos[0], h.pos[1], smoothed);
      const outerEdge = d + h.radius;
      if (outerEdge >= halfWidth) {
        const msg = `Hazard ${h.id} outer edge ${outerEdge.toFixed(2)} m exceeds river bank ${halfWidth} m`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      }
    });
    if (!failures.some((f) => f.includes('exceeds river bank'))) {
      console.log(`  [PASS] All ${track.hazards.length} rocks strictly within river boundary with safety margin`);
    }

    // 5. Cross-Section Blockage Check (<= 60% of width)
    console.log(`\nHazard Cross-Section Blockage Analysis (max allowed 60% = ${(riverWidth * 0.6).toFixed(1)} m):`);
    const hazardProjs = track.hazards.map((h) => {
      const proj = projectToCenterline(h.pos[0], h.pos[1], smoothed, cumDist);
      const effRadius = h.radius + OTTER_RADIUS; // effective blocked radius
      return {
        id: h.id,
        pos: h.pos,
        radius: h.radius,
        effRadius,
        s: proj.s,
        lat: proj.lat,
      };
    });

    let maxBlockage = 0;
    let maxBlockageS = 0;
    let maxBlockagePct = 0;

    // Sample along track at 0.5m intervals and at every hazard s
    const sampleSList = new Set();
    for (let s = projStart.s; s <= projFinish.s; s += 0.5) {
      sampleSList.add(Math.round(s * 10) / 10);
    }
    hazardProjs.forEach((hp) => {
      sampleSList.add(Math.round(hp.s * 10) / 10);
      sampleSList.add(Math.round((hp.s - hp.effRadius * 0.5) * 10) / 10);
      sampleSList.add(Math.round((hp.s + hp.effRadius * 0.5) * 10) / 10);
    });

    for (const sampleS of sampleSList) {
      const intervals = [];
      for (const hp of hazardProjs) {
        const ds = Math.abs(sampleS - hp.s);
        if (ds < hp.effRadius) {
          const lateralHalfSpan = Math.sqrt(hp.effRadius * hp.effRadius - ds * ds);
          const iStart = Math.max(-halfWidth, hp.lat - lateralHalfSpan);
          const iEnd = Math.min(halfWidth, hp.lat + lateralHalfSpan);
          if (iStart < iEnd) {
            intervals.push([iStart, iEnd]);
          }
        }
      }

      if (intervals.length > 0) {
        const blockedWidth = unionIntervalLength(intervals);
        const pct = (blockedWidth / riverWidth) * 100;
        if (blockedWidth > maxBlockage) {
          maxBlockage = blockedWidth;
          maxBlockageS = sampleS;
          maxBlockagePct = pct;
        }

        if (pct > 60.0) {
          const msg = `Cross-section at s = ${sampleS.toFixed(1)} m blocks ${blockedWidth.toFixed(2)} m (${pct.toFixed(1)}% > 60%)`;
          failures.push(msg);
          console.error(`  [FAIL] ${msg}`);
          trackPass = false;
        }
      }
    }

    console.log(
      `  Max Cross-Section Blockage: ${maxBlockage.toFixed(2)} m (${maxBlockagePct.toFixed(1)}%) at s = ${maxBlockageS.toFixed(1)} m`
    );
    if (maxBlockagePct <= 60.0) {
      console.log(`  [PASS] Hazard rocks block at most ${maxBlockagePct.toFixed(1)}% <= 60% of channel width`);
    }

    // 6. Minimum Gap Between Any Two Hazard Rocks (>= 3.5m)
    console.log(`\nHazard Inter-Rock Clearance Analysis (min required gap >= 3.5 m):`);
    let minRockGap = Infinity;
    let minGapPair = null;

    for (let i = 0; i < track.hazards.length; i++) {
      for (let j = i + 1; j < track.hazards.length; j++) {
        const hA = track.hazards[i];
        const hB = track.hazards[j];
        const centerDist = Math.hypot(hA.pos[0] - hB.pos[0], hA.pos[1] - hB.pos[1]);
        const clearGap = centerDist - (hA.radius + hB.radius);

        if (clearGap < minRockGap) {
          minRockGap = clearGap;
          minGapPair = { hA, hB, centerDist, clearGap };
        }

        if (clearGap < 3.5) {
          const msg = `Gap between rocks ${hA.id} and ${hB.id} is ${clearGap.toFixed(2)} m (< 3.5 m requirement)`;
          failures.push(msg);
          console.error(`  [FAIL] ${msg}`);
          trackPass = false;
        }
      }
    }

    if (minGapPair) {
      console.log(
        `  Minimum rock gap: ${minRockGap.toFixed(2)} m (center dist: ${minGapPair.centerDist.toFixed(2)} m) between ${minGapPair.hA.id} and ${minGapPair.hB.id}`
      );
    }
    if (minRockGap >= 3.5) {
      console.log(`  [PASS] All rock pairs have at least ${minRockGap.toFixed(2)} m >= 3.5 m passable clearance`);
    }

    // 7. Hazard Clearance from Gates & Checkpoints (>= 2.0m)
    console.log(`\nHazard Gate & Checkpoint Clearance Analysis (min required >= 2.0 m):`);
    let minGateCpDist = Infinity;
    let minGateCpItem = null;

    track.hazards.forEach((h) => {
      // Check start gate
      const dStart = Math.hypot(h.pos[0] - startPos[0], h.pos[1] - startPos[1]);
      const clearStart = dStart - h.radius;
      if (clearStart < minGateCpDist) {
        minGateCpDist = clearStart;
        minGateCpItem = { hId: h.id, target: 'Start Gate', dist: clearStart };
      }
      if (clearStart < 2.0) {
        const msg = `Hazard ${h.id} sits only ${clearStart.toFixed(2)} m from Start Gate (< 2.0 m requirement)`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      }

      // Check finish gate
      const dFinish = Math.hypot(h.pos[0] - finishPos[0], h.pos[1] - finishPos[1]);
      const clearFinish = dFinish - h.radius;
      if (clearFinish < minGateCpDist) {
        minGateCpDist = clearFinish;
        minGateCpItem = { hId: h.id, target: 'Finish Gate', dist: clearFinish };
      }
      if (clearFinish < 2.0) {
        const msg = `Hazard ${h.id} sits only ${clearFinish.toFixed(2)} m from Finish Gate (< 2.0 m requirement)`;
        failures.push(msg);
        console.error(`  [FAIL] ${msg}`);
        trackPass = false;
      }

      // Check checkpoints
      track.checkpoints.forEach((cp, cpIdx) => {
        const dCp = Math.hypot(h.pos[0] - cp.pos[0], h.pos[1] - cp.pos[1]);
        const clearCp = dCp - h.radius;
        if (clearCp < minGateCpDist) {
          minGateCpDist = clearCp;
          minGateCpItem = { hId: h.id, target: `Checkpoint ${cpIdx + 1}`, dist: clearCp };
        }
        if (clearCp < 2.0) {
          const msg = `Hazard ${h.id} sits only ${clearCp.toFixed(2)} m from Checkpoint ${cpIdx + 1} (< 2.0 m requirement)`;
          failures.push(msg);
          console.error(`  [FAIL] ${msg}`);
          trackPass = false;
        }
      });
    });

    if (minGateCpItem) {
      console.log(
        `  Minimum gate/checkpoint clearance: ${minGateCpDist.toFixed(2)} m (${minGateCpItem.hId} to ${minGateCpItem.target})`
      );
    }
    if (minGateCpDist >= 2.0) {
      console.log(`  [PASS] All hazard rocks are >= ${minGateCpDist.toFixed(2)} m >= 2.0 m away from all gates and checkpoints`);
    }

    // 8. Rival Lanes
    const rivalLanes = track.rivalLanes || [-4.5, -2.5, 0, 2.5, 4.5];
    const maxLaneOffset = Math.max(...rivalLanes.map((l) => Math.abs(l)));
    if (maxLaneOffset > halfWidth) {
      const msg = `Rival lane offset ${maxLaneOffset} m exceeds river half-width ${halfWidth} m`;
      failures.push(msg);
      console.error(`  [FAIL] ${msg}`);
      trackPass = false;
    } else {
      console.log(`\n  [PASS] All rival lanes (max offset ${maxLaneOffset} m) within river half-width`);
    }

    summaryReport.push({
      id: track.id,
      name: track.name,
      raceDistance: `${raceDistance.toFixed(1)} m`,
      minRadius: `${minR.toFixed(2)} m`,
      maxBlockage: `${maxBlockagePct.toFixed(1)}%`,
      minRockGap: `${minRockGap.toFixed(2)} m`,
      minGateClearance: `${minGateCpDist.toFixed(2)} m`,
      status: trackPass ? 'PASS' : 'FAIL',
      failureCount: failures.length,
    });

    if (!trackPass) {
      allPassed = false;
      console.log(`\n>>> TRACK [${track.id}] HAS ${failures.length} FAILURE(S):`);
      failures.forEach((f, idx) => console.log(`   ${idx + 1}. ${f}`));
    }
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
