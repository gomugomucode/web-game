/**
 * Live Telemetry Store
 * Plain mutable reference object for high-frequency game loop data (speed, heading, dash timers).
 * Conforms to Section 4 & Section 6.6: never enters React state, avoiding whole-tree re-renders.
 */

export interface OtterTelemetry {
  speed: number;
  headingDeg: number;
  dashCooldownRemaining: number;
  isDashing: boolean;
  position: [number, number, number];
  inCurrent: boolean;
  playerRank: number;
  totalRacers: number;
  drawCalls: number;
  triangles: number;
  fps: number;
}

export const otterTelemetry: OtterTelemetry = {
  speed: 0,
  headingDeg: 0,
  dashCooldownRemaining: 0,
  isDashing: false,
  position: [0, 0, 0],
  inCurrent: false,
  playerRank: 1,
  totalRacers: 4,
  drawCalls: 0,
  triangles: 0,
  fps: 60,
};

if (typeof window !== 'undefined') {
  (window as unknown as { __otterTelemetry: OtterTelemetry }).__otterTelemetry = otterTelemetry;
}

