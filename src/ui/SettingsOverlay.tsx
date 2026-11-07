'use client';

import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '../game/useGameStore';
import { soundManager } from '../game/audio/soundManager';

/**
 * SettingsOverlay Component (Milestone 12)
 * Provides Master, Music, and SFX volume sliders, Mute toggle, and Graphics Quality selection.
 * Reachable from the Pause Menu and from the Hub.
 */
export function SettingsOverlay() {
  const isSettingsOpen = useGameStore((state) => state.isSettingsOpen);
  const settings = useGameStore((state) => state.settings);
  const closeSettings = useGameStore((state) => state.closeSettings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const toggleMute = useGameStore((state) => state.toggleMute);

  const handleSliderChange = useCallback(
    (key: 'masterVolume' | 'musicVolume' | 'sfxVolume', value: number) => {
      updateSettings({ [key]: value });
    },
    [updateSettings]
  );

  const handleGraphicsQuality = useCallback(
    (quality: 'high' | 'low') => {
      soundManager.playUiClick();
      updateSettings({ graphicsQuality: quality });
    },
    [updateSettings]
  );

  // Esc key closes settings
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border-2 border-sky-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_60px_rgba(56,189,248,0.25)] text-white flex flex-col gap-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h2 className="text-2xl font-black tracking-wide bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">
                AUDIO & SETTINGS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure sound levels and graphics quality
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Sliders & Controls */}
        <div className="space-y-4">
          {/* Mute Quick Toggle */}
          <div className="flex items-center justify-between bg-slate-800/60 p-3.5 rounded-2xl border border-white/5">
            <div>
              <div className="text-sm font-bold text-slate-200">Mute All Audio</div>
              <div className="text-xs text-slate-400">Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-amber-300">M</kbd> anytime</div>
            </div>
            <button
              type="button"
              onClick={toggleMute}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                settings.muted
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {settings.muted ? '🔇 Muted' : '🔊 Sound On'}
            </button>
          </div>

          {/* Master Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Master Volume</span>
              <span className="font-mono text-sky-400 font-bold">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => handleSliderChange('masterVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Sound Effects (SFX & Ambience)</span>
              <span className="font-mono text-emerald-400 font-bold">
                {Math.round(settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => handleSliderChange('sfxVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Graphics Quality */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Graphics Quality
              </span>
              <span className="text-[11px] text-slate-400">
                {settings.graphicsQuality === 'high' ? 'High DPR (Sharp)' : 'Clamped DPR (Performance)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleGraphicsQuality('high')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  settings.graphicsQuality === 'high'
                    ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md shadow-sky-500/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                High
              </button>
              <button
                type="button"
                onClick={() => handleGraphicsQuality('low')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  settings.graphicsQuality === 'low'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Low (Fast)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>Settings save automatically</span>
          <button
            type="button"
            onClick={closeSettings}
            className="py-2 px-5 bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsOverlay;
