import { Track, Current, Vec2 } from './types';
import { smoothCenterline } from '../math';

const rawCenterline: Track['centerline'] = [
  [0, -30], // Extended run-up before start so camera and start gate sit fully on water
  [0, 0],
  [0, 60],
  [25, 110],
  [70, 140],
  [120, 140],
  [150, 100],
  [150, 40],
  [120, 0],
  [102, -24], // Extended run-off past finish gate so coasting otter stays on water
];

// Precomputed Catmull-Rom smoothed centerline shared across physics, collision, and rendering (Step 0)
export const river01SmoothedCenterline = smoothCenterline(rawCenterline, 14);

/**
 * Precomputes smoothed polyline, cumulative distances, and total length for a current (Task A)
 */
function processCurrentData(
  id: string,
  rawPoints: Vec2[],
  width: number,
  strength: number
): Current {
  const smoothed = smoothCenterline(rawPoints, 12);
  const cumDist: number[] = [0];
  for (let i = 0; i < smoothed.length - 1; i++) {
    const d = Math.hypot(
      smoothed[i + 1][0] - smoothed[i][0],
      smoothed[i + 1][1] - smoothed[i][1]
    );
    cumDist.push(cumDist[i] + d);
  }
  const totalLength = cumDist[cumDist.length - 1] || 1;

  return {
    id,
    points: rawPoints,
    smoothedPoints: smoothed,
    cumDist,
    totalLength,
    width,
    strength,
  };
}

const c1 = processCurrentData(
  'c1',
  [
    [2.5, 24.4],
    [5.7, 66.7],
    [27.9, 107.5],
    [64.6, 134.0],
  ],
  3,
  8
);

const c2 = processCurrentData(
  'c2',
  [
    [136.2, 132.1],
    [155.6, 93.0],
    [153.6, 38.9],
    [131.3, 7.1],
  ],
  3,
  8
);

/**
 * Sample Track: river01 (Section 7)
 * "Calm Bend": A winding scenic river with calm stretches, wide turns, and currents.
 */
export const river01: Track = {
  id: 'river-01',
  name: 'Calm Bend',
  description: 'A winding scenic river with calm stretches, wide turns, and currents.',
  unlockCondition: 'Default track (always unlocked)',
  centerline: rawCenterline,
  smoothedCenterline: river01SmoothedCenterline,
  halfWidth: 9,
  start: {
    pos: [0, 2],
    heading: 0, // Faces +Z along initial river segment
  },
  checkpoints: [
    { pos: [0, 55], radius: 9 },
    { pos: [45, 125], radius: 9 },
    { pos: [150, 90], radius: 9 },
    { pos: [124, 5], radius: 9 },
  ],
  currents: [c1, c2],
  hazards: [
    // Hazards near Current 1 (staggered inside / edge of c1, width 3, rock radius 1.2m)
    { id: 'h_c1_1', pos: [4.4, 54.3], radius: 1.2 },
    { id: 'h_c1_2', pos: [13.5, 87.8], radius: 1.2 },
    { id: 'h_c1_3', pos: [32.7, 110.6], radius: 1.2 },
    { id: 'h_c1_4', pos: [51.6, 127.1], radius: 1.2 },

    // Hazards near Current 2 (staggered inside / edge of c2, width 3, rock radius 1.2m)
    { id: 'h_c2_1', pos: [152.1, 106.5], radius: 1.2 },
    { id: 'h_c2_2', pos: [156.3, 72.0], radius: 1.2 },
    { id: 'h_c2_3', pos: [155.6, 41.9], radius: 1.2 },
    { id: 'h_c2_4', pos: [142.0, 21.0], radius: 1.2 },
  ],
  laps: 1,
};

