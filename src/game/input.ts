'use client';

import { useEffect, useRef } from 'react';

export interface InputState {
  forward: boolean;   // W or ArrowUp
  backward: boolean;  // S or ArrowDown
  left: boolean;      // A or ArrowLeft
  right: boolean;     // D or ArrowRight
  dash: boolean;      // Space
  restart: boolean;   // R
}

const DEFAULT_INPUT_STATE: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  dash: false,
  restart: false,
};

const PREVENT_DEFAULT_KEYS = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * Custom hook maintaining keyboard input state in a mutable ref.
 * Follows section 6.1:
 * - Prevents default for Space and Arrow keys to avoid page scrolling
 * - Clears all key states on window blur
 */
export function useKeyboardInput() {
  const inputRef = useRef<InputState>({ ...DEFAULT_INPUT_STATE });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (PREVENT_DEFAULT_KEYS.has(event.code)) {
        event.preventDefault();
      }

      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = true;
          break;
        case 'Space':
          inputRef.current.dash = true;
          break;
        case 'KeyR':
          inputRef.current.restart = true;
          break;
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputRef.current.right = false;
          break;
        case 'Space':
          inputRef.current.dash = false;
          break;
        case 'KeyR':
          inputRef.current.restart = false;
          break;
      }
    }

    function handleBlur() {
      // Clear all active keys when window loses focus
      inputRef.current.forward = false;
      inputRef.current.backward = false;
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.dash = false;
      inputRef.current.restart = false;
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

