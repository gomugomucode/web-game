'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { sharedOtterRefs } from './sharedRefs';

/**
 * CameraRig - Milestone 2
 * Third-person follow camera:
 * - Follows 7 units behind along heading, 3.5 units above the water/otter
 * - LookAt target is 3 units ahead of the otter
 * - Smoothed with 1 - exp(-6 * dt)
 * - Field of view: 60 at rest, rising by up to +10 during dash, easing back afterward
 * - Reads position, heading, and dash status from shared refs
 * - Zero per-frame allocations
 * - Guaranteed to never clip below water surface (y = 0)
 */
export function CameraRig() {
  // Scratch vectors allocated once and reused every frame (no allocations in useFrame)
  const currentCamPos = useRef(
    new THREE.Vector3(
      0,
      GAME_CONSTANTS.CAMERA_HEIGHT,
      -GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE
    )
  );
  const currentLookAt = useRef(
    new THREE.Vector3(
      0,
      GAME_CONSTANTS.CAMERA_LOOK_AHEAD_Y,
      GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE
    )
  );
  const tempDesiredCamPos = useRef(new THREE.Vector3());
  const tempDesiredLookAt = useRef(new THREE.Vector3());

  // Dynamic FOV tracker
  const currentFovRef = useRef<number>(GAME_CONSTANTS.CAMERA_BASE_FOV);
  const isInitializedRef = useRef(false);

  useFrame((state, delta) => {
    // 1. Clamp dt to max delta per Section 4 convention
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0) return;

    // 2. Read live otter position, heading, and dash state from shared refs
    const pos = sharedOtterRefs.position;
    const h = sharedOtterRefs.heading;
    const isDashing = sharedOtterRefs.isDashing;

    // 3. Compute forward direction vector from yaw heading (0 faces +Z)
    const sinH = Math.sin(h);
    const cosH = Math.cos(h);

    // 4. Compute desired camera position: 7 units behind along heading, 3.5 units above
    // Heading forward = (sin h, 0, cos h), so behind = pos - 7 * forward
    const behindX = pos.x - GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE * sinH;
    const behindZ = pos.z - GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE * cosH;
    const desiredY = Math.max(
      GAME_CONSTANTS.CAMERA_MIN_Y,
      pos.y + GAME_CONSTANTS.CAMERA_HEIGHT
    );
    tempDesiredCamPos.current.set(behindX, desiredY, behindZ);

    // 5. Compute look-at point: 3 units ahead along heading
    const lookX = pos.x + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * sinH;
    const lookY = Math.max(0.1, pos.y + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_Y);
    const lookZ = pos.z + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * cosH;
    tempDesiredLookAt.current.set(lookX, lookY, lookZ);

    // 6. Handle initial mount or position reset (<kbd>R</kbd>) to prevent lag flying
    if (!isInitializedRef.current || sharedOtterRefs.hasReset) {
      currentCamPos.current.copy(tempDesiredCamPos.current);
      currentLookAt.current.copy(tempDesiredLookAt.current);
      currentFovRef.current = GAME_CONSTANTS.CAMERA_BASE_FOV;
      isInitializedRef.current = true;
      sharedOtterRefs.hasReset = false;
    } else {
      // 7. Smooth exponential interpolation: 1 - exp(-6 * dt)
      const blend = 1 - Math.exp(-GAME_CONSTANTS.CAMERA_SMOOTH_RATE * dt);
      currentCamPos.current.lerp(tempDesiredCamPos.current, blend);
      currentLookAt.current.lerp(tempDesiredLookAt.current, blend);
    }

    // 8. Strict anti-clipping: camera must never go below water surface (y = 0)
    if (currentCamPos.current.y < GAME_CONSTANTS.CAMERA_MIN_Y) {
      currentCamPos.current.y = GAME_CONSTANTS.CAMERA_MIN_Y;
    }

    // 9. Apply position and lookAt to camera
    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentLookAt.current);

    // 10. Dynamic Field of View: 60 at rest, rising up to +10 during dash, easing back
    const targetFov = isDashing
      ? GAME_CONSTANTS.CAMERA_BASE_FOV + GAME_CONSTANTS.CAMERA_DASH_FOV_BOOST
      : GAME_CONSTANTS.CAMERA_BASE_FOV;

    const fovBlend = 1 - Math.exp(-GAME_CONSTANTS.CAMERA_FOV_SMOOTH_RATE * dt);
    currentFovRef.current += (targetFov - currentFovRef.current) * fovBlend;

    if (state.camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(state.camera.fov - currentFovRef.current) > 0.01) {
        state.camera.fov = currentFovRef.current;
        state.camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

