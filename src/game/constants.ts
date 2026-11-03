/**
 * Otter Run - Game Constants
 * All tunable parameters live here to avoid magic numbers across the codebase.
 * Units: 1 world unit = 1 meter.
 */

export const GAME_CONSTANTS = {
  // Loop & Time
  MAX_DELTA_TIME: 0.05, // Clamped dt to prevent physics explosions on lag spikes

  // Movement (Section 6.2)
  ACCEL: 10.0, // Forward thrust acceleration (m/s²) when W is held
  DRAG: 0.9, // Water drag coefficient; cruise speed is ACCEL / DRAG (~11.1 m/s)
  BRAKE_DRAG: 2.5, // Additional drag applied when S or Down is held (slow down, no reverse)

  // Steering
  TURN_RATE: 2.4, // Base yaw turning rate in radians per second
  TURN_SPEED_REF: 3.0, // Reference speed (m/s) for calculating turn factor
  TURN_FACTOR_MIN: 0.35, // Minimum turn factor at zero speed (turning works slowly at standstill)
  TURN_FACTOR_MAX: 1.0, // Maximum turn factor at cruise speed

  // Water Drift / Lateral Grip
  LATERAL_DAMP: 4.0, // Exponential damping rate for sideways velocity (allows drift in turns)

  // Dash Mechanic
  DASH_IMPULSE: 10.0, // Immediate velocity boost along forward vector (m/s)
  DASH_DURATION: 0.5, // Duration (seconds) of boosted thrust
  DASH_THRUST_MULT: 1.5, // Multiplier for forward thrust while dash boost is active
  DASH_COOLDOWN: 2.5, // Cooldown timer (seconds) before another dash can be triggered

  // Track & Boundary (Milestone 3, Section 6.2)
  RIVER_HALF_WIDTH: 9.0, // Base river half-width in meters
  BOUNDARY_COLLISION_RADIUS: 0.45, // Otter collision offset against river banks
  BOUNDARY_SPEED_MULTIPLIER: 0.7, // Section 6.2: Multiply speed by 0.7 on bank contact
  BANK_HEIGHT: 0.85, // Elevation of grassy bank above water level
  BANK_WIDTH: 4.5, // Width of raised bank slope
  BANK_TOP_COLOR: '#22c55e', // Vibrant anime green grass
  BANK_SLOPE_COLOR: '#57534e', // Earthen river bank rock/soil

  // Camera (Section 6.4 & Milestone 2)
  CAMERA_BEHIND_DISTANCE: 7.0, // Units behind the otter along heading
  CAMERA_HEIGHT: 3.5, // Units above the water/otter
  CAMERA_LOOK_AHEAD_DISTANCE: 3.0, // Units ahead of the otter along heading to look at
  CAMERA_LOOK_AHEAD_Y: 0.5, // Height offset for camera look-at target
  CAMERA_SMOOTH_RATE: 6.0, // Rate for 1 - exp(-6 * dt) exponential smoothing
  CAMERA_MIN_Y: 0.5, // Absolute minimum camera Y to prevent going below water surface (y = 0)
  CAMERA_BASE_FOV: 60.0, // Field of view at rest
  CAMERA_DASH_FOV_BOOST: 10.0, // Up to +10 FOV during dash (reaching 70 FOV)
  CAMERA_FOV_SMOOTH_RATE: 5.0, // Easing rate for FOV transitions

  // Visual Feedback (Cosmetic only)
  ROLL_MAX: 0.35, // Maximum bank angle (radians) during hard steering
  ROLL_DAMP: 6.0, // Exponential smoothing rate for banking roll
  BOB_AMPLITUDE: 0.06, // Height (meters) of swimming bob oscillation
  BOB_FREQUENCY: 7.0, // Frequency of swimming bob oscillation
  SQUASH_STRETCH_AMOUNT: 0.2, // Visual mesh scale deformation during dash

  // Otter Dimensions (Placeholder capsule)
  OTTER_RADIUS: 0.35, // Radius of capsule (meters)
  OTTER_LENGTH: 0.9, // Length of capsule cylinder portion (meters)

  // World & Aesthetics (Vision document: Genshin-like bright anime nature)
  WATER_COLOR: '#0891b2', // Deep clear blue-green
  WATER_SURFACE_COLOR: '#22d3ee', // Highlight water cyan
  WATER_SURFACE_Y: 0.0,
  FOG_COLOR: '#bae6fd',
  FOG_NEAR: 80,
  FOG_FAR: 320,
  SKY_COLOR: '#7dd3fc',
  GROUND_VALLEY_COLOR: '#16a34a',
  CANVAS_DPR: [1, 2] as [number, number],
} as const;

export type MovementTunables = {
  accel: number;
  drag: number;
  brakeDrag: number;
  turnRate: number;
  lateralDamp: number;
  dashImpulse: number;
  dashCooldown: number;
  dashDuration: number;
  dashThrustMult: number;
};

export const DEFAULT_MOVEMENT_TUNABLES: MovementTunables = {
  accel: GAME_CONSTANTS.ACCEL,
  drag: GAME_CONSTANTS.DRAG,
  brakeDrag: GAME_CONSTANTS.BRAKE_DRAG,
  turnRate: GAME_CONSTANTS.TURN_RATE,
  lateralDamp: GAME_CONSTANTS.LATERAL_DAMP,
  dashImpulse: GAME_CONSTANTS.DASH_IMPULSE,
  dashCooldown: GAME_CONSTANTS.DASH_COOLDOWN,
  dashDuration: GAME_CONSTANTS.DASH_DURATION,
  dashThrustMult: GAME_CONSTANTS.DASH_THRUST_MULT,
};
