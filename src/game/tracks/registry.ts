import * as THREE from 'three';
import { Track } from './types';
import { river01 } from './river01';
import { river02 } from './river02';
import { river03 } from './river03';
import { smoothCenterline } from '../math';
import { GAME_CONSTANTS } from '../constants';

export const TRACK_REGISTRY: Record<string, Track> = {
  'river-01': river01,
  'river-02': river02,
  'river-03': river03,
};

export const TRACK_LIST: Track[] = [river01, river02, river03];

export function getTrack(id: string): Track {
  return TRACK_REGISTRY[id] || river01;
}

export interface TrackHazardCoord {
  s: number;
  lateral: number;
  radius: number;
}

export interface TrackMetadata {
  track: Track;
  smoothedCenterline: [number, number][];
  centerlineCumDist: number[];
  totalTrackLength: number;
  startTrackDistance: number;
  finishTrackDistance: number;
  hazardCoords: TrackHazardCoord[];
  sampleTrack: (
    s: number,
    outPos: THREE.Vector3,
    outTangent: THREE.Vector3,
    outNormal: THREE.Vector3
  ) => void;
}

function computeTrackDistance(
  smoothedCenterline: [number, number][],
  cumDist: number[],
  targetX: number,
  targetZ: number
): number {
  let bestDist = Infinity;
  let bestS = 0;
  for (let i = 0; i < smoothedCenterline.length - 1; i++) {
    const pA = smoothedCenterline[i];
    const pB = smoothedCenterline[i + 1];
    const dx = pB[0] - pA[0];
    const dz = pB[1] - pA[1];
    const segLen2 = dx * dx + dz * dz;
    if (segLen2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((targetX - pA[0]) * dx + (targetZ - pA[1]) * dz) / segLen2));
    const px = pA[0] + t * dx;
    const pz = pA[1] + t * dz;
    const d = Math.hypot(targetX - px, targetZ - pz);
    if (d < bestDist) {
      bestDist = d;
      bestS = cumDist[i] + t * Math.sqrt(segLen2);
    }
  }
  return bestS;
}

function buildTrackMetadata(track: Track): TrackMetadata {
  const smoothed = track.smoothedCenterline ?? smoothCenterline(track.centerline, 14);

  const cumDist: number[] = [0];
  for (let i = 1; i < smoothed.length; i++) {
    const dx = smoothed[i][0] - smoothed[i - 1][0];
    const dz = smoothed[i][1] - smoothed[i - 1][1];
    cumDist.push(cumDist[i - 1] + Math.hypot(dx, dz));
  }
  const totalLength = cumDist[cumDist.length - 1] || 1;

  const startTrackDist = computeTrackDistance(smoothed, cumDist, track.start.pos[0], track.start.pos[1]);
  const finishCp = track.checkpoints[track.checkpoints.length - 1];
  const finishTrackDist = computeTrackDistance(smoothed, cumDist, finishCp.pos[0], finishCp.pos[1]);

  const hazardCoords: TrackHazardCoord[] = track.hazards.map((h) => {
    let bestDist = Infinity;
    let bestS = 0;
    let bestLat = 0;
    for (let i = 0; i < smoothed.length - 1; i++) {
      const pA = smoothed[i];
      const pB = smoothed[i + 1];
      const dx = pB[0] - pA[0];
      const dz = pB[1] - pA[1];
      const segLen2 = dx * dx + dz * dz;
      if (segLen2 < 1e-6) continue;
      const segLen = Math.sqrt(segLen2);
      const t = Math.max(0, Math.min(1, ((h.pos[0] - pA[0]) * dx + (h.pos[1] - pA[1]) * dz) / segLen2));
      const px = pA[0] + t * dx;
      const pz = pA[1] + t * dz;
      const d = Math.hypot(h.pos[0] - px, h.pos[1] - pz);
      if (d < bestDist) {
        bestDist = d;
        bestS = cumDist[i] + t * segLen;
        const nx = -dz / segLen;
        const nz = dx / segLen;
        bestLat = (h.pos[0] - px) * nx + (h.pos[1] - pz) * nz;
      }
    }
    return { s: bestS, lateral: bestLat, radius: h.radius };
  });

  const sample = (
    s: number,
    outPos: THREE.Vector3,
    outTangent: THREE.Vector3,
    outNormal: THREE.Vector3
  ) => {
    const sClamped = Math.max(0, Math.min(totalLength, s));
    let low = 0;
    let high = cumDist.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (cumDist[mid] <= sClamped) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const idx = Math.max(0, Math.min(smoothed.length - 2, high));
    const d0 = cumDist[idx];
    const d1 = cumDist[idx + 1];
    const segLen = d1 - d0;
    const t = segLen < 1e-5 ? 0 : (sClamped - d0) / segLen;

    const pA = smoothed[idx];
    const pB = smoothed[idx + 1];

    const dx = pB[0] - pA[0];
    const dz = pB[1] - pA[1];
    const invLen = segLen < 1e-5 ? 1 : 1 / segLen;

    outPos.set(
      pA[0] + t * dx,
      GAME_CONSTANTS.WATER_SURFACE_Y,
      pA[1] + t * dz
    );
    outTangent.set(dx * invLen, 0, dz * invLen);
    outNormal.set(-dz * invLen, 0, dx * invLen);
  };

  return {
    track,
    smoothedCenterline: smoothed,
    centerlineCumDist: cumDist,
    totalTrackLength: totalLength,
    startTrackDistance: startTrackDist,
    finishTrackDistance: finishTrackDist,
    hazardCoords,
    sampleTrack: sample,
  };
}

const METADATA_CACHE: Record<string, TrackMetadata> = {
  'river-01': buildTrackMetadata(river01),
  'river-02': buildTrackMetadata(river02),
};

export function getTrackMetadata(trackOrId: Track | string): TrackMetadata {
  const id = typeof trackOrId === 'string' ? trackOrId : trackOrId.id;
  if (!METADATA_CACHE[id]) {
    const trk = typeof trackOrId === 'string' ? getTrack(trackOrId) : trackOrId;
    METADATA_CACHE[id] = buildTrackMetadata(trk);
  }
  return METADATA_CACHE[id];
}

