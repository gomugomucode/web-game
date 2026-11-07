'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '../game/useGameStore';

/**
 * PauseOverlay Component (Milestone 12)
 * Freezes gameplay and offers Resume, Restart (race mode only), Settings, and Return to Hub.
 */
export function PauseOverlay() {
  const isPaused = useGameStore((state) => state.isPaused);
  const isSettingsOpen = useGameStore((state) => state.isSettingsOpen);
  const mode = useGameStore((state) => state.mode);
  const resume = useGameStore((state) => state.resume);
  const restart = useGameStore((state) => state.restart);
  const returnToHub = useGameStore((state) => state.returnToHub);
  const openSettings = useGameStore((state) => state.openSettings);
  const toggleMute = useGameStore((state) => state.toggleMute);
  const settings = useGameStore((state) => state.settings);

  // Keyboard navigation when pause menu is open
  useEffect(() => {
    if (!isPaused || isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        resume();
      } else if (e.code === 'KeyR' || e.key.toLowerCase() === 'r') {
        if (mode === 'race') {
          e.preventDefault();
          e.stopPropagation();
          restart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isPaused, isSettingsOpen, mode, resume, restart]);

  if (!isPaused || isSettingsOpen) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_60px_rgba(16,185,129,0.25)] text-white flex flex-col items-center gap-6 animate-in zoom-in-95 duration-150 text-center">
        {/* Title */}
        <div className="space-y-1">
          <div className="text-3xl">⏸️</div>
          <h2 className="text-2xl font-black tracking-wider bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            GAME PAUSED
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'hub' ? 'Otter Haven Pond' : 'River Race'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          {/* Resume */}
          <button
            type="button"
            onClick={resume}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Resume</span>
            <kbd className="px-2 py-0.5 bg-slate-950/30 rounded text-[11px] font-mono">Esc</kbd>
          </button>

          {/* Restart (Race mode only) */}
          {mode === 'race' && (
            <button
              type="button"
              onClick={() => {
                restart();
                resume();
              }}
              className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-2xl border border-amber-500/30 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Restart Race</span>
              <kbd className="px-2 py-0.5 bg-slate-900 rounded text-[10px] font-mono text-slate-300">R</kbd>
            </button>
          )}

          {/* Settings */}
          <button
            type="button"
            onClick={openSettings}
            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs uppercase tracking-wider rounded-2xl border border-sky-400/30 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⚙️ Settings & Audio</span>
          </button>

          {/* Return to Hub */}
          {mode === 'race' && (
            <button
              type="button"
              onClick={returnToHub}
              className="w-full py-2.5 px-6 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs uppercase tracking-wider rounded-2xl border border-white/10 transition-all active:scale-95 cursor-pointer"
            >
              ← Return to Hub
            </button>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between text-[11px] text-slate-400">
          <span>Audio: <button onClick={toggleMute} className="text-amber-300 underline cursor-pointer">{settings.muted ? 'Muted (M)' : 'On (M)'}</button></span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">Esc</kbd> to return</span>
        </div>
      </div>
    </div>
  );
}

export default PauseOverlay;
