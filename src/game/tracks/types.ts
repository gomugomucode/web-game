/**
 * Track Data Specifications (Section 7)
 * Units: 1 world unit = 1 meter.
 */

export type Vec2 = [number, number]; // [x, z] in world units

export interface Checkpoint {
  pos: Vec2;
  radius: number;
}

export interface Current {
  id: string;
  points: Vec2[]; // polyline inside the river
  width: number; // influence radius
  strength: number; // acceleration, units per second squared
}

export interface Track {
  id: string;
  name: string;
  centerline: Vec2[];
  halfWidth: number;
  start: {
    pos: Vec2;
    heading: number;
  };
  checkpoints: Checkpoint[];
  currents: Current[];
  laps: number;
}

