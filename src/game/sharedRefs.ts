import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';

/**
 * Shared Game Loop Refs (Milestone 2)
 * High-frequency physics and transform values shared between Otter and CameraRig.
 * Section 4: Never stored in React state or zustand to avoid whole-tree re-renders.
 */
export interface OtterSharedRefs {
  position: THREE.Vector3;
  heading: number; // Yaw angle in radians, 0 = facing +Z
  isDashing: boolean;
  hasReset: boolean;
}

export const sharedOtterRefs: OtterSharedRefs = {
  position: new THREE.Vector3(
    GAME_CONSTANTS.HUB_SPAWN_POS[0],
    GAME_CONSTANTS.WATER_SURFACE_Y,
    GAME_CONSTANTS.HUB_SPAWN_POS[1]
  ),
  heading: GAME_CONSTANTS.HUB_SPAWN_HEADING,
  isDashing: false,
  hasReset: false,
};

