'use client';

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GAME_CONSTANTS } from './constants';
import { sharedOtterRefs } from './sharedRefs';
import { useGameStore } from './useGameStore';
import { getTrack } from './tracks/registry';
import { findNearestPointOnPolyline } from './math';
import { InputState } from './input';

interface CameraRigProps {
  inputRef?: React.MutableRefObject<InputState>;
}

/**
 * CameraRig - Milestone 15: Genshin-style Orbit Camera & Classic Camera Option
 * - Camera-relative mode:
 *   - Mouse look with pointer lock (click viewport to lock)
 *   - Mouse moves orbit camera around the otter (yaw and pitch)
 *   - Pitch clamped so camera stays above water and under max angle
 *   - Mouse wheel zooms between 4 m and 12 m
 *   - Middle click or C key recenters camera behind otter
 *   - Sensitivity slider and Invert Y from settings
 *   - Camera assist (races only): after 1.5 s of no mouse input, gently turns toward river direction
 *   - Arrow keys fallback rotates and tilts camera
 *   - When cursor is free (pointer lock off or menu open), camera does not move
 * - Classic mode:
 *   - Follows behind the otter along heading with smoothing
 * - Zero per-frame allocations in useFrame
 * - Dynamic FOV boost (+10 FOV during dash)
 * - Strict anti-clipping (y >= CAMERA_MIN_Y)
 */
export function CameraRig({ inputRef }: CameraRigProps) {
  // Reusable scratch vectors to guarantee ZERO heap allocations in useFrame
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

  // Mouse orbit accumulated deltas & orientation refs
  const mouseDeltaXRef = useRef(0);
  const mouseDeltaYRef = useRef(0);
  const lastMouseMoveTimeRef = useRef<number>(0);
  const camOrbitYawRef = useRef<number>(GAME_CONSTANTS.HUB_SPAWN_HEADING);
  const camOrbitPitchRef = useRef<number>(0.2);
  const zoomDistRef = useRef<number>(GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE);

  // Classic mode drag look offsets (preserved for Classic mode)
  const classicDragYawRef = useRef(0);
  const classicDragPitchRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  // Reactive listener to release pointer lock when any modal/overlay opens
  const isPaused = useGameStore((s) => s.isPaused);
  const isDialogueOpen = useGameStore((s) => s.isDialogueOpen);
  const isTrackSelectOpen = useGameStore((s) => s.isTrackSelectOpen);
  const isSettingsOpen = useGameStore((s) => s.isSettingsOpen);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    const isModalOpen =
      isPaused || isDialogueOpen || isTrackSelectOpen || isSettingsOpen || phase === 'finished';
    if (isModalOpen && typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [isPaused, isDialogueOpen, isTrackSelectOpen, isSettingsOpen, phase]);

  useEffect(() => {
    lastMouseMoveTimeRef.current = performance.now();

    function isInteractiveTarget(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          'button, input, select, textarea, a, [role="button"], [class*="leva"], [data-no-camera-drag]'
        )
      );
    }

    // 1. Pointer Lock Event Handlers
    function handlePointerLockChange() {
      const isLocked = document.pointerLockElement === document.body;
      sharedOtterRefs.isPointerLocked = isLocked;
      const store = useGameStore.getState();
      store.setPointerLocked(isLocked);

      // Releasing pointer lock (e.g. Esc) opens pause menu if not in a modal or finished
      if (!isLocked) {
        if (
          !store.isPaused &&
          !store.isDialogueOpen &&
          !store.isTrackSelectOpen &&
          !store.isSettingsOpen &&
          store.phase !== 'finished'
        ) {
          store.pause();
        }
      }
    }

    function handlePointerLockError() {
      console.warn('Pointer lock request was refused or unsupported.');
      const store = useGameStore.getState();
      store.setPointerLockRefused(true);
      store.setPointerLocked(false);
      sharedOtterRefs.isPointerLocked = false;
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);

    // 2. Click to Request Pointer Lock / Middle Click Recenter
    function handlePointerDown(e: PointerEvent) {
      if (isInteractiveTarget(e.target)) return;

      const store = useGameStore.getState();
      const isModalOpen =
        store.isPaused ||
        store.isDialogueOpen ||
        store.isTrackSelectOpen ||
        store.isSettingsOpen ||
        store.phase === 'finished';

      // Middle mouse click (button 1) recenters camera behind otter
      if (e.button === 1) {
        e.preventDefault();
        camOrbitYawRef.current = sharedOtterRefs.heading;
        camOrbitPitchRef.current = 0.2;
        classicDragYawRef.current = 0;
        classicDragPitchRef.current = 0;
        return;
      }

      if (store.settings.controlMode === 'camera-relative') {
        // Request pointer lock on viewport click if no modal is open
        if (!isModalOpen && document.pointerLockElement !== document.body) {
          try {
            const promise = document.body.requestPointerLock() as unknown;
            if (promise && typeof (promise as Promise<void>).catch === 'function') {
              (promise as Promise<void>).catch(() => {
                store.setPointerLockRefused(true);
              });
            }
          } catch {
            store.setPointerLockRefused(true);
          }
        }
      } else {
        // Classic mode drag
        if (e.button === 0 || e.button === 2) {
          isDraggingRef.current = true;
          lastPointerPosRef.current.x = e.clientX;
          lastPointerPosRef.current.y = e.clientY;
        }
      }
    }

    // 3. Mouse Movement (Accumulate deltas outside useFrame loop)
    function handleMouseMove(e: MouseEvent) {
      const store = useGameStore.getState();
      const isModalOpen =
        store.isPaused ||
        store.isDialogueOpen ||
        store.isTrackSelectOpen ||
        store.isSettingsOpen ||
        store.phase === 'finished';

      if (isModalOpen) return;

      if (store.settings.controlMode === 'camera-relative') {
        // Camera-relative: only move camera when pointer is locked!
        if (document.pointerLockElement === document.body) {
          const sensitivity =
            GAME_CONSTANTS.CAMERA_POINTER_SENSITIVITY *
            (store.settings.mouseSensitivity || 1.0);
          const invertFactor = store.settings.invertY ? -1 : 1;

          mouseDeltaXRef.current += e.movementX * sensitivity;
          mouseDeltaYRef.current += e.movementY * sensitivity * invertFactor;
          lastMouseMoveTimeRef.current = performance.now();
        }
      } else {
        // Classic mode drag orbit
        if (isDraggingRef.current) {
          const dx = e.clientX - lastPointerPosRef.current.x;
          const dy = e.clientY - lastPointerPosRef.current.y;
          lastPointerPosRef.current.x = e.clientX;
          lastPointerPosRef.current.y = e.clientY;

          classicDragYawRef.current -= dx * GAME_CONSTANTS.CAMERA_DRAG_SENSITIVITY_X;
          classicDragPitchRef.current = Math.max(
            -0.4,
            Math.min(0.7, classicDragPitchRef.current - dy * GAME_CONSTANTS.CAMERA_DRAG_SENSITIVITY_Y)
          );
        }
      }
    }

    function handlePointerUp() {
      isDraggingRef.current = false;
    }

    // 4. Mouse Wheel Zoom (4m to 12m)
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

    function handleContextMenu(e: MouseEvent) {
      if (!isInteractiveTarget(e.target)) {
        e.preventDefault();
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useFrame((state, delta) => {
    // 1. Clamp dt to max delta per Section 4 convention
    const dt = Math.min(delta, GAME_CONSTANTS.MAX_DELTA_TIME);
    if (dt <= 0) return;

    const store = useGameStore.getState();
    if (store.isPaused) return;

    const isCameraRelative = store.settings.controlMode === 'camera-relative';
    const pos = sharedOtterRefs.position;
    const otterHeading = sharedOtterRefs.heading;
    const isDashing = sharedOtterRefs.isDashing;

    // Handle initial mount or position reset (<kbd>R</kbd>)
    if (!isInitializedRef.current || sharedOtterRefs.hasReset) {
      camOrbitYawRef.current = otterHeading;
      camOrbitPitchRef.current = 0.2;
      classicDragYawRef.current = 0;
      classicDragPitchRef.current = 0;
      zoomDistRef.current = GAME_CONSTANTS.CAMERA_BEHIND_DISTANCE;
      lastMouseMoveTimeRef.current = performance.now();

      const initX = pos.x - zoomDistRef.current * Math.sin(otterHeading);
      const initZ = pos.z - zoomDistRef.current * Math.cos(otterHeading);
      currentCamPos.current.set(initX, pos.y + GAME_CONSTANTS.CAMERA_HEIGHT, initZ);
      currentLookAt.current.set(
        pos.x + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * Math.sin(otterHeading),
        pos.y + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_Y,
        pos.z + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * Math.cos(otterHeading)
      );
      currentFovRef.current = GAME_CONSTANTS.CAMERA_BASE_FOV;
      isInitializedRef.current = true;
      sharedOtterRefs.hasReset = false;
    }

    // 2. Process Input (Mouse deltas, C recenter, and Arrow keys)
    const inp = inputRef?.current;

    // Recenter (C key)
    if (inp?.recenter) {
      camOrbitYawRef.current = otterHeading;
      camOrbitPitchRef.current = 0.2;
      classicDragYawRef.current = 0;
      classicDragPitchRef.current = 0;
    }

    let finalCamYaw = otterHeading;
    let finalPitch = 0.2;

    if (isCameraRelative) {
      // Consume accumulated mouse deltas
      camOrbitYawRef.current -= mouseDeltaXRef.current;
      camOrbitPitchRef.current = Math.max(
        GAME_CONSTANTS.CAMERA_PITCH_MIN,
        Math.min(GAME_CONSTANTS.CAMERA_PITCH_MAX, camOrbitPitchRef.current + mouseDeltaYRef.current)
      );
      mouseDeltaXRef.current = 0;
      mouseDeltaYRef.current = 0;

      // Fallback Arrow Keys for Camera Orbit
      if (inp?.camLeft) camOrbitYawRef.current += GAME_CONSTANTS.CAMERA_ARROW_KEY_SPEED_YAW * dt;
      if (inp?.camRight) camOrbitYawRef.current -= GAME_CONSTANTS.CAMERA_ARROW_KEY_SPEED_YAW * dt;
      if (inp?.camUp) {
        camOrbitPitchRef.current = Math.max(
          GAME_CONSTANTS.CAMERA_PITCH_MIN,
          camOrbitPitchRef.current - GAME_CONSTANTS.CAMERA_ARROW_KEY_SPEED_PITCH * dt
        );
      }
      if (inp?.camDown) {
        camOrbitPitchRef.current = Math.min(
          GAME_CONSTANTS.CAMERA_PITCH_MAX,
          camOrbitPitchRef.current + GAME_CONSTANTS.CAMERA_ARROW_KEY_SPEED_PITCH * dt
        );
      }

      // 3. Camera Assist (Requirement 3: on in race mode, after 1.5s idle)
      const now = performance.now();
      const isIdle = now - lastMouseMoveTimeRef.current > GAME_CONSTANTS.CAMERA_ASSIST_IDLE_DELAY * 1000;
      if (
        store.mode === 'race' &&
        store.settings.cameraAssist &&
        isIdle &&
        !inp?.camLeft &&
        !inp?.camRight
      ) {
        const track = getTrack(store.activeTrackId);
        const pts = track.smoothedCenterline ?? track.centerline;
        const curRes = findNearestPointOnPolyline(pos.x, pos.z, pts);
        const targetRiverYaw = Math.atan2(curRes.tangentX, curRes.tangentZ);

        // Shortest angular difference
        let diff = targetRiverYaw - camOrbitYawRef.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const assistBlend = 1 - Math.exp(-GAME_CONSTANTS.CAMERA_ASSIST_STRENGTH * dt);
        camOrbitYawRef.current += diff * assistBlend;
      }

      // Write cameraYaw to shared refs for Otter steering
      sharedOtterRefs.cameraYaw = camOrbitYawRef.current;
      finalCamYaw = camOrbitYawRef.current;
      finalPitch = camOrbitPitchRef.current;
    } else {
      // Classic mode: camera aligns behind otter heading with drag offset
      if (!isDraggingRef.current && sharedOtterRefs.isMovingForward) {
        const decay = Math.exp(-GAME_CONSTANTS.CAMERA_RECENTER_RATE * dt);
        classicDragYawRef.current *= decay;
        classicDragPitchRef.current *= decay;
      }
      finalCamYaw = otterHeading + classicDragYawRef.current;
      finalPitch = classicDragPitchRef.current;
      sharedOtterRefs.cameraYaw = otterHeading;
    }

    // 4. Compute Camera Placement & LookAt
    const sinCam = Math.sin(finalCamYaw);
    const cosCam = Math.cos(finalCamYaw);
    const dist = zoomDistRef.current;

    const behindX = pos.x - dist * Math.cos(finalPitch) * sinCam;
    const behindZ = pos.z - dist * Math.cos(finalPitch) * cosCam;
    const desiredY = Math.max(
      GAME_CONSTANTS.CAMERA_MIN_Y,
      pos.y + GAME_CONSTANTS.CAMERA_HEIGHT + dist * Math.sin(finalPitch)
    );
    tempDesiredCamPos.current.set(behindX, desiredY, behindZ);

    const lookX = pos.x + (isCameraRelative ? 0 : GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * sinCam);
    const lookY = Math.max(0.1, pos.y + GAME_CONSTANTS.CAMERA_LOOK_AHEAD_Y);
    const lookZ = pos.z + (isCameraRelative ? 0 : GAME_CONSTANTS.CAMERA_LOOK_AHEAD_DISTANCE * cosCam);
    tempDesiredLookAt.current.set(lookX, lookY, lookZ);

    // 5. Exponential Smoothing (1 - exp(-6 * dt))
    const blend = 1 - Math.exp(-GAME_CONSTANTS.CAMERA_SMOOTH_RATE * dt);
    currentCamPos.current.lerp(tempDesiredCamPos.current, blend);
    currentLookAt.current.lerp(tempDesiredLookAt.current, blend);

    // 6. Strict Anti-clipping: camera must never clip below water surface
    if (currentCamPos.current.y < GAME_CONSTANTS.CAMERA_MIN_Y) {
      currentCamPos.current.y = GAME_CONSTANTS.CAMERA_MIN_Y;
    }

    // 7. Apply to Three.js camera
    state.camera.position.copy(currentCamPos.current);
    state.camera.lookAt(currentLookAt.current);

    // 8. Dynamic FOV (+10 FOV during dash)
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
