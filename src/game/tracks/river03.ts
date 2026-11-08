import { Track, Current, Vec2 } from './types';
import { smoothCenterline } from '../math';

const rawCenterline: Track['centerline'] = [
  [0, -25], // Extended run-up before start
  [0, 0],
  [0, 35], // Initial straight
  [18, 75], // Wide sweeping right curve entry
  [48, 115],
  [68, 160], // Sweeping curve apex
  [65, 205],
  [38, 245], // Sweeping curve exit into canyon
  [8, 275],
  [-22, 298], // Entry into tight hairpin
  [-45, 310],
  [-58, 335], // Apex of tight hairpin loop
  [-52, 365],
  [-28, 390], // Hairpin exit straightening out
  [-8, 415],
  [0, 445], // Finish Gate approach
  [0, 470], // Run-off past finish gate
];

// Precomputed Catmull-Rom smoothed centerline shared across physics, collision, and rendering
export const river03SmoothedCenterline = smoothCenterline(rawCenterline, 14);

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

// Current 1: swift push into the wide sweeping curve
const c1 = processCurrentData(
  'c1',
  [
    [0.5, 25.0],
    [8.5, 55.0],
    [26.0, 88.0],
    [48.0, 118.0],
  ],
  3,
  8.0
);

// Current 2: high-speed surge around the sweeping apex into the canyon
const c2 = processCurrentData(
  'c2',
  [
    [64.0, 145.0],
    [68.5, 178.0],
    [62.0, 212.0],
    [44.0, 240.0],
  ],
  3,
  8.5
);

// Current 3: rapid channel slicing through the tight hairpin turn
const c3 = processCurrentData(
  'c3',
  [
    [-6.0, 288.0],
    [-34.0, 305.0],
    [-56.0, 332.0],
    [-52.0, 362.0],
  ],
  3,
  9.0
);

// Current 4: The Wellspring Surge - strongest current in the last third powering the sprint to the finish
const c4 = processCurrentData(
  'c4',
  [
    [-38.0, 380.0],
    [-22.0, 400.0],
    [-7.0, 420.0],
    [-0.5, 442.0],
  ],
  3.5,
  10.0 // Strongest current in the last third
);

/**
 * Track: river03 (Milestone 14 / Story Part 2)
 * "The Wellspring Run": An ancient, revered river course with a sweeping curve,
 * a tight technical hairpin, and a high-speed sprint into the sacred glowing pool finish.
 */
export const river03: Track = {
  id: 'river-03',
  name: 'The Wellspring Run',
  description: 'An ancient mountain course with sweeping rapids, a tight hairpin, and a high-speed sprint to the Wellspring.',
  unlockCondition: 'Finish Serpentine Rapids in top 3 to unlock',
  centerline: rawCenterline,
  smoothedCenterline: river03SmoothedCenterline,
  halfWidth: 9,
  start: {
    pos: [0, 2],
    heading: 0, // Faces +Z along initial river segment
  },
  checkpoints: [
    { pos: [0.0, 20.0], radius: 9 }, // CP 1
    { pos: [48.0, 115.0], radius: 9 }, // CP 2: Sweeping curve entry
    { pos: [53.0, 226.0], radius: 9 }, // CP 3: Sweeping curve exit
    { pos: [-49.0, 314.0], radius: 9 }, // CP 4: Hairpin entry
    { pos: [-39.0, 380.0], radius: 9 }, // CP 5: Hairpin exit
    { pos: [0.0, 445.0], radius: 9 }, // Finish Gate (Glowing Wellspring Pool)
  ],
  currents: [c1, c2, c3, c4],
  hazards: [
    // Hazards along Current 1 (staggered left/right within current corridor)
    { id: 'h3_c1_1', pos: [3.5, 45.0], radius: 1.2 },
    { id: 'h3_c1_2', pos: [15.0, 72.0], radius: 1.2 },
    { id: 'h3_c1_3', pos: [34.0, 102.0], radius: 1.2 },

    // Hazards along Current 2 (staggered around wide apex)
    { id: 'h3_c2_1', pos: [63.0, 160.0], radius: 1.2 },
    { id: 'h3_c2_2', pos: [69.0, 192.0], radius: 1.2 },
    { id: 'h3_c2_3', pos: [51.0, 231.0], radius: 1.2 },

    // Hazards along Hairpin Bend (Current 3)
    { id: 'h3_c3_1', pos: [-16.0, 296.0], radius: 1.2 },
    { id: 'h3_c3_2', pos: [-42.0, 318.0], radius: 1.2 },
    { id: 'h3_c3_3', pos: [-57.0, 345.0], radius: 1.2 },
    { id: 'h3_c3_4', pos: [-48.0, 368.0], radius: 1.2 },

    // Hazards along Final Sprint (Current 4 - high speed dodging)
    { id: 'h3_c4_1', pos: [-31.0, 388.0], radius: 1.2 },
    { id: 'h3_c4_2', pos: [-18.0, 408.0], radius: 1.2 },
    { id: 'h3_c4_3', pos: [-7.0, 426.0], radius: 1.2 },
    { id: 'h3_c4_4', pos: [2.0, 436.0], radius: 1.2 },
  ],
  laps: 1,
};
