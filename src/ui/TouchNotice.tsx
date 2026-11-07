'use client';

import React, { useState, useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  try {
    const mql = window.matchMedia('(hover: none) and (pointer: coarse)');
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  } catch {
    return () => {};
  }
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isCoarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    return Boolean(hasTouch && isCoarse);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * TouchNotice Component (Milestone 12: Production Hardening)
 * Displays a friendly non-blocking banner on touch-only devices indicating that a physical keyboard is required.
 */
export function TouchNotice() {
  const isTouchDevice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isTouchDevice || isDismissed) return null;

  return (
    <div className="pointer-events-auto fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] bg-slate-900/95 border-2 border-amber-400/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⌨️</span>
        <div className="space-y-1 flex-1">
          <h4 className="text-sm font-black text-amber-300 tracking-wide uppercase">
            Keyboard Required
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Otter Run is an arcade racer designed for keyboard controls (<kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300 font-bold">W/A/S/D</kbd> or Arrow keys to swim, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300 font-bold">Space</kbd> to dash).
            Please connect a physical keyboard or enjoy the game on a desktop computer!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex-shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default TouchNotice;
