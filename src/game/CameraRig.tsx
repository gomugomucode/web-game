'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { sharedOtterRefs } from './sharedRefs';
import { useGameStore } from './useGameStore';

/**
 * CameraRig - Enhanced with Mouse Look & Orbit Controls
 * Third-person follow camera:
 * - Follows behind the otter along heading with smooth mouse-look / orbit capability
 * - LookAt target is positioned ahead of the otter along the camera view angle
 * - Drag (left or right click) allows free 360-degree orbit around the otter
 * - Mouse cursor movement (hover) provides subtle responsive side-looking (glance tracking)
 * - Swimming forward (W / Up) smoothly re-aligns camera behind the otter when not dragging
 * - Scroll wheel zooms between 4m and 12m
 * - Double-click snaps camera back to center
 * - Smoothed with exponential interpolation (1 - exp(-rate * dt))
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

  // Mouse look state refs
  const dragYawRef = useRef(0);
  const dragPitchRef = useRef(0);
  const hoverYawRef = useRef(0);
  const hoverPitchRef = useRef(0);
  const targetHoverYawRef = useRef(0);
  const targetHoverPitchRef = useRef(0);

  const zoomDistRef = useRef<number>(GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  // Event listeners for mouse look & zoom
  useEffect(() => {
    function isInteractiveTarget(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          'button, input, select, textarea, a, [role="button"], [class*="leva"], [data-no-camera-drag]'
        )
      );
    }

    function handlePointerDown(e: PointerEvent) {
      if (isInteractiveTarget(e.target)) return;
      // Allow left click (0), middle click (1), or right click (2)
      if (e.button === 0 || e.button === 1 || e.button === 2) {
        isDraggingRef.current = true;
        didDragRef.current = false;
        lastPointerPosRef.current.x = e.clientX;
        lastPointerPosRef.current.y = e.clientY;
      }
    }

    function handlePointerMove(e: PointerEvent) {
      // 1. Update subtle hover gaze tracking from cursor position
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      targetHoverYawRef.current = normX * GAME_CONSTANTS.CAMERA_MOUSE_HOVER_YAW_MAX;
      targetHoverPitchRef.current = -normY * GAME_CONSTANTS.CAMERA_MOUSE_HOVER_PITCH_MAX;

      // 2. Handle active mouse drag for orbit
      if (isDraggingRef.current) {
        const dx = e.clientX - lastPointerPosRef.current.x;
        const dy = e.clientY - lastPointerPosRef.current.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          didDragRef.current = true;
        }
        lastPointerPosRef.current.x = e.clientX;
        lastPointerPosRef.current.y = e.clientY;

        dragYawRef.current -= dx * GAME_CONSTANTS.CAMERA_DRAG_SENSITIVITY_X;
        dragPitchRef.current = Math.max(
          -0.4,
          Math.min(0.7, dragPitchRef.current - dy * GAME_CONSTANTS.CAMERA_DRAG_SENSITIVITY_Y)
        );
      }
    }

    function handlePointerUp() {
      isDraggingRef.current = false;
    }

    function handlePointerCancel() {
      isDraggingRef.current = false;
    }

    function handleMouseLeave() {
      targetHoverYawRef.current = 0;
      targetHoverPitchRef.current = 0;
      isDraggingRef.current = false;
    }

    function handleDblClick(e: MouseEvent) {
      if (isInteractiveTarget(e.target)) return;
      // Double click resets mouse view to neutral behind otter
      dragYawRef.current = 0;
      dragPitchRef.current = 0;
    }

    function handleContextMenu(e: MouseEvent) {
      // Suppress context menu if dragged or clicking in 3D area
      if (didDragRef.current || !isInteractiveTarget(e.target)) {
        e.preventDefault();
      }
    }

    function handleWheel(e: WheelEvent) {
      if (isInteractiveTarget(e.target)) return;
      zoomDistRef.current = Math.max(
        GAME_CONSTANTS.CAMERA_MIN_DISTANCE,
        Math.min(
          GAME_CONSTANTS.CAMERA_MAX_DISTANCE,
          zoomDistRef.current + e.deltaY * 0.005
        )
      );
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('dblclick', handleDblClick);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('dblclick', handleDblClick);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useFrame((state, delta) => {
    // 1. Clamp dt to max delta per Section 4 convention
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0) return;

    if (useGameStore.getState().isPaused) return;

    // 2. Read live otter position, heading, and dash state from shared refs
    const pos = sharedOtterRefs.position;
    const h = sharedOtterRefs.heading;
    const isDashing = sharedOtterRefs.isDashing;

    // 3. Smooth hover angles towards targets
    const hoverBlend = 1 - Math.exp(-8.0 * dt);
    hoverYawRef.current += (targetHoverYawRef.current - hoverYawRef.current) * hoverBlend;
    hoverPitchRef.current += (targetHoverPitchRef.current - hoverPitchRef.current) * hoverBlend;

    // 4. Auto-recenter drag offset when swimming forward without dragging
    if (!isDraggingRef.current && sharedOtterRefs.isMovingForward) {
      const recenterDecay = Math.exp(-GAME_CONSTANTS.CAMERA_RECENTER_RATE * dt);
      dragYawRef.current *= recenterDecay;
      dragPitchRef.current *= recenterDecay;
    }

    // 5. Compute combined camera view yaw and pitch angles
    const totalCamYaw = h + dragYawRef.current + hoverYawRef.current;
    const totalPitch = dragPitchRef.current + hoverPitchRef.current;

    const sinCam = Math.sin(totalCamYaw);
    const cosCam = Math.cos(totalCamYaw);
    const dist = zoomDistRef.current;

    // 6. Compute desired camera position: placed behind along totalCamYaw, elevated above water
    const behindX = pos.x - dist * sinCam;
    const behindZ = pos.z - dist * cosCam;
    const desiredY = Math.max(
      GAME_CONSTANTS.CAMERA_MIN_Y,
      pos.y + GAME_CONSTANTS.CAMERA_HEIGHT + totalPitch * 3.0
    );
    tempDesiredCamPos.current.set(behindX, desiredY, behindZ);

    // 7. Compute look-at point: centered on otter with slight look-ahead along view direction
    const lookX = pos.x + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * sinCam;
    const lookY = Math.max(0.1, pos.y + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_Y + totalPitch * 0.8);
    const lookZ = pos.z + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * cosCam;
    tempDesiredLookAt.current.set(lookX, lookY, lookZ);

    // 8. Handle initial mount or position reset (<kbd>R</kbd>) to prevent lag flying
    if (!isInitializedRef.current || sharedOtterRefs.hasReset) {
      dragYawRef.current = 0;
      dragPitchRef.current = 0;
      hoverYawRef.current = 0;
      hoverPitchRef.current = 0;
      targetHoverYawRef.current = 0;
      targetHoverPitchRef.current = 0;
      zoomDistRef.current = GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE;

      currentCamPos.current.copy(tempDesiredCamPos.current);
      currentLookAt.current.copy(tempDesiredLookAt.current);
      currentFovRef.current = GAME_CONSTANTS.CAMERA_BASE_FOV;
      isInitializedRef.current = true;
      sharedOtterRefs.hasReset = false;
    } else {
      // 9. Smooth exponential interpolation: 1 - exp(-6 * dt)
      const blend = 1 - Math.exp(-GAME_CONSTANTS.CAMERA_SMOOTH_RATE * dt);
      currentCamPos.current.lerp(tempDesiredCamPos.current, blend);
      currentLookAt.current.lerp(tempDesiredLookAt.current, blend);
    }

    // 10. Strict anti-clipping: camera must never go below water surface (y = 0)
    if (currentCamPos.current.y < GAME_CONSTANTS.CAMERA_MIN_Y) {
      currentCamPos.current.y = GAME_CONSTANTS.CAMERA_MIN_Y;
    }

    // 11. Apply position and lookAt to camera
    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentLookAt.current);

    // 12. Dynamic Field of View: 60 at rest, rising up to +10 during dash, easing back
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
