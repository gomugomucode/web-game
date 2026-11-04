import { Track } from './types';
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
 * Sample Track: river01 (Section 7)
 * "Calm Bend": A winding scenic river with calm stretches, wide turns, and currents.
 */
export const river01: Track = {
  id: 'river-01',
  name: 'Calm Bend',
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
  currents: [
    {
      id: 'c1',
      points: [
        [2.5, 24.4],
        [5.7, 66.7],
        [27.9, 107.5],
        [64.6, 134.0],
      ],
      width: 3,
      strength: 8,
    },
    {
      id: 'c2',
      points: [
        [136.2, 132.1],
        [155.6, 93.0],
        [153.6, 38.9],
        [131.3, 7.1],
      ],
      width: 3,
      strength: 8,
    },
  ],
  laps: 1,
};

