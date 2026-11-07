'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from './useGameStore';

export interface InputState {
  forward: boolean;   // W
  backward: boolean;  // S
  left: boolean;      // A
  right: boolean;     // D
  dash: boolean;      // Shift or Space
  restart: boolean;   // R
  start: boolean;     // Enter or Space
  interact: boolean;  // F or E
  recenter: boolean;  // C or Middle Click
  // Arrow key fallback for camera orbit in camera-relative mode
  camLeft: boolean;
  camRight: boolean;
  camUp: boolean;
  camDown: boolean;
}

const DEFAULT_INPUT_STATE: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  dash: false,
  restart: false,
  start: false,
  interact: false,
  recenter: false,
  camLeft: false,
  camRight: false,
  camUp: false,
  camDown: false,
};

const PREVENT_DEFAULT_KEYS = new Set([
  'Space',
  'Enter',
  'NumpadEnter',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * Custom hook maintaining keyboard input state in a mutable ref.
 * Supports rebindable keys via useGameStore settings, secondary defaults,
 * and arrow keys for camera rotation in camera-relative mode.
 */
export function useKeyboardInput() {
  const inputRef = useRef<InputState>({ ...DEFAULT_INPUT_STATE });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (PREVENT_DEFAULT_KEYS.has(event.code)) {
        event.preventDefault();
      }

      const store = useGameStore.getState();
      const settings = store.settings;
      const bindings = settings.keyBindings;
      const isCameraRelative = settings.controlMode === 'camera-relative';

      // 1. Rebindable actions & secondary defaults
      // Forward
      if (event.code === bindings.forward || (!isCameraRelative && event.code === 'ArrowUp')) {
        inputRef.current.forward = true;
      }

      // Backward (Brake)
      if (event.code === bindings.backward || (!isCameraRelative && event.code === 'ArrowDown')) {
        inputRef.current.backward = true;
      }

      // Left
      if (event.code === bindings.left || (!isCameraRelative && event.code === 'ArrowLeft')) {
        inputRef.current.left = true;
      }

      // Right
      if (event.code === bindings.right || (!isCameraRelative && event.code === 'ArrowRight')) {
        inputRef.current.right = true;
      }

      // Dash (Rebindable, default Left Shift, Space also works as default secondary)
      if (
        event.code === bindings.dash ||
        event.code === 'Space' ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight'
      ) {
        inputRef.current.dash = true;
      }

      // Interact (Rebindable, default F, E also works as default secondary)
      if (event.code === bindings.interact || event.code === 'KeyF' || event.code === 'KeyE') {
        inputRef.current.interact = true;
      }

      // Restart (Rebindable, default R)
      if (event.code === bindings.restart || event.code === 'KeyR' || event.key.toLowerCase() === 'r') {
        inputRef.current.restart = true;
      }

      // Recenter camera (Rebindable, default C)
      if (event.code === bindings.recenter || event.code === 'KeyC' || event.key.toLowerCase() === 'c') {
        inputRef.current.recenter = true;
      }

      // Start race from ready screen (Enter or Space)
      if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
        inputRef.current.start = true;
      }

      // 2. Camera-relative mode: Arrow keys rotate camera
      if (isCameraRelative) {
        if (event.code === 'ArrowLeft') inputRef.current.camLeft = true;
        if (event.code === 'ArrowRight') inputRef.current.camRight = true;
        if (event.code === 'ArrowUp') inputRef.current.camUp = true;
        if (event.code === 'ArrowDown') inputRef.current.camDown = true;
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const store = useGameStore.getState();
      const settings = store.settings;
      const bindings = settings.keyBindings;
      const isCameraRelative = settings.controlMode === 'camera-relative';

      if (event.code === bindings.forward || (!isCameraRelative && event.code === 'ArrowUp')) {
        inputRef.current.forward = false;
      }

      if (event.code === bindings.backward || (!isCameraRelative && event.code === 'ArrowDown')) {
        inputRef.current.backward = false;
      }

      if (event.code === bindings.left || (!isCameraRelative && event.code === 'ArrowLeft')) {
        inputRef.current.left = false;
      }

      if (event.code === bindings.right || (!isCameraRelative && event.code === 'ArrowRight')) {
        inputRef.current.right = false;
      }

      if (
        event.code === bindings.dash ||
        event.code === 'Space' ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight'
      ) {
        inputRef.current.dash = false;
      }

      if (event.code === bindings.interact || event.code === 'KeyF' || event.code === 'KeyE') {
        inputRef.current.interact = false;
      }

      if (event.code === bindings.restart || event.code === 'KeyR' || event.key.toLowerCase() === 'r') {
        inputRef.current.restart = false;
      }

      if (event.code === bindings.recenter || event.code === 'KeyC' || event.key.toLowerCase() === 'c') {
        inputRef.current.recenter = false;
      }

      if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
        inputRef.current.start = false;
      }

      if (isCameraRelative) {
        if (event.code === 'ArrowLeft') inputRef.current.camLeft = false;
        if (event.code === 'ArrowRight') inputRef.current.camRight = false;
        if (event.code === 'ArrowUp') inputRef.current.camUp = false;
        if (event.code === 'ArrowDown') inputRef.current.camDown = false;
      }
    }

    function handleBlur() {
      inputRef.current.forward = false;
      inputRef.current.backward = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.dash = false;
      inputRef.current.restart = false;
      inputRef.current.start = false;
      inputRef.current.interact = false;
      inputRef.current.recenter = false;
      inputRef.current.camLeft = false;
      inputRef.current.camRight = false;
      inputRef.current.camUp = false;
      inputRef.current.camDown = false;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return inputRef;
}
