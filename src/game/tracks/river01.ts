import { Track } from './types';

/**
 * Sample Track: river01 (Section 7)
 * "Calm Bend": A winding scenic river with calm stretches, wide turns, and currents.
 */
export const river01: Track = {
  id: 'river-01',
  name: 'Calm Bend',
  centerline: [
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
  ],
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
        [4, 20],
        [4, 55],
        [22, 98],
      ],
      width: 3,
      strength: 8,
    },
    {
      id: 'c2',
      points: [
        [110, 138],
        [141, 112],
        [146, 60],
      ],
      width: 3,
      strength: 8,
    },
  ],
  laps: 1,
};

