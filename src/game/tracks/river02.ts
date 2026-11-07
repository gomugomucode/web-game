import { Track, Current, Vec2 } from './types';
import { smoothCenterline } from '../math';

const rawCenterline: Track['centerline'] = [
  [0, -30], // Extended run-up before start so camera and start gate sit fully on water
  [0, 0],
  [0, 45], // Initial straight
  [22, 90], // Sweeping right bend
  [58, 130],
  [72, 175], // Apex of first right loop
  [52, 220],
  [15, 260], // Crossing midline
  [-25, 300],
  [-55, 345], // Apex of reverse left loop
  [-45, 395],
  [-15, 435], // Straightening out into finish approach
  [0, 470],
  [5, 495], // Extended run-off past finish gate
];

// Precomputed Catmull-Rom smoothed centerline shared across physics, collision, and rendering
export const river02SmoothedCenterline = smoothCenterline(rawCenterline, 14);

/**
 * Precomputes smoothed polyline, cumulative distances, and total length for a current
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

// Current 1: swift push through the right hairpin bend
const c1 = processCurrentData(
  'c1',
  [
    [1.0, 25.0],
    [9.7, 63.4],
    [33.7, 99.9],
    [63.2, 135.2],
  ],
  3,
  8.5
);

// Current 2: diagonal rapid across the mid-canyon S-crossing into the left loop
const c2 = processCurrentData(
  'c2',
  [
    [58.2, 206.5],
    [30.0, 241.1],
    [-7.2, 277.9],
    [-42.2, 317.4],
  ],
  3,
  9.0
);

// Current 3: high-speed surge powering the final sprint toward the finish line
const c3 = processCurrentData(
  'c3',
  [
    [-53.5, 359.0],
    [-42.7, 393.9],
    [-16.9, 428.3],
    [-3.3, 455.3],
  ],
  3,
  8.0
);

/**
 * Sample Track: river02 (Milestone 11)
 * "Serpentine Rapids": A challenging S-curve canyon with intense currents and rock hazards.
 */
export const river02: Track = {
  id: 'river-02',
  name: 'Serpentine Rapids',
  description: 'A winding S-curve canyon with fast crossing currents and staggered rock hazards.',
  unlockCondition: 'Finish Calm Bend in top 3 to unlock',
  centerline: rawCenterline,
  smoothedCenterline: river02SmoothedCenterline,
  halfWidth: 9,
  start: {
    pos: [0, 2],
    heading: 0, // Faces +Z along initial river segment
  },
  checkpoints: [
    { pos: [-1.2, 18.2], radius: 9 },
    { pos: [56.1, 127.0], radius: 9 },
    { pos: [23.4, 251.5], radius: 9 },
    { pos: [-51.7, 377.7], radius: 9 },
    { pos: [0.7, 472.2], radius: 9 }, // Finish Gate
  ],
  currents: [c1, c2, c3],
  hazards: [
    // Hazards along Current 1 (staggered left/right within current corridor)
    { id: 'h2_c1_1', pos: [1.2, 44.7], radius: 1.2 },
    { id: 'h2_c1_2', pos: [17.3, 75.6], radius: 1.2 },
    { id: 'h2_c1_3', pos: [38.6, 106.1], radius: 1.2 },

    // Hazards along Current 2 (staggered across diagonal S-crossing)
    { id: 'h2_c2_1', pos: [46.7, 225.2], radius: 1.2 },
    { id: 'h2_c2_2', pos: [12.3, 257.3], radius: 1.2 },
    { id: 'h2_c2_3', pos: [-20.9, 293.0], radius: 1.2 },

    // Hazards along Current 3 (staggered on the exit sprint)
    { id: 'h2_c3_1', pos: [-49.5, 381.0], radius: 1.2 },
    { id: 'h2_c3_2', pos: [-20.3, 421.9], radius: 1.2 },
  ],
  laps: 1,
};
