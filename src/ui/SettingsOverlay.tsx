'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../game/useGameStore';
import { soundManager } from '../game/audio/soundManager';
import { ControlMode, KeyBindings, DEFAULT_KEY_BINDINGS } from '../game/saveSystem';

type SettingsTab = 'controls' | 'bindings' | 'audio';

const BINDING_LABELS: Record<keyof KeyBindings, string> = {
  forward: 'Move Forward',
  backward: 'Brake / Backward',
  left: 'Move Left',
  right: 'Move Right',
  dash: 'Dash (Boost)',
  interact: 'Interact / Talk',
  pause: 'Pause Game',
  restart: 'Restart Race',
  mute: 'Toggle Audio Mute',
  recenter: 'Recenter Camera',
};

function formatKeyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft') return 'Left Shift';
  if (code === 'ShiftRight') return 'Right Shift';
  if (code === 'ControlLeft') return 'Left Ctrl';
  if (code === 'ControlRight') return 'Right Ctrl';
  if (code === 'AltLeft') return 'Left Alt';
  if (code === 'Escape') return 'Esc';
  return code;
}

/**
 * SettingsOverlay Component - Milestone 12 & 15
 * Offers:
 * 1. Control mode (Camera-relative vs Classic), Sensitivity, Invert Y, Camera Assist
 * 2. Rebindable Key Bindings with conflict warnings and reset to defaults
 * 3. Master & SFX volume sliders, Mute toggle, and Graphics Quality
 */
export function SettingsOverlay() {
  const isSettingsOpen = useGameStore((state) => state.isSettingsOpen);
  const settings = useGameStore((state) => state.settings);
  const closeSettings = useGameStore((state) => state.closeSettings);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const toggleMute = useGameStore((state) => state.toggleMute);

  const [activeTab, setActiveTab] = useState<SettingsTab>('controls');
  const [rebindingAction, setRebindingAction] = useState<keyof KeyBindings | null>(null);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const handleSliderChange = useCallback(
    (key: 'masterVolume' | 'musicVolume' | 'sfxVolume', value: number) => {
      updateSettings({ [key]: value });
    },
    [updateSettings]
  );

  const handleControlMode = useCallback(
    (mode: ControlMode) => {
      soundManager.playUiClick();
      updateSettings({ controlMode: mode });
    },
    [updateSettings]
  );

  const handleSensitivity = useCallback(
    (val: number) => {
      updateSettings({ mouseSensitivity: val });
    },
    [updateSettings]
  );

  const handleToggleInvertY = useCallback(() => {
    soundManager.playUiClick();
    updateSettings({ invertY: !settings.invertY });
  }, [settings.invertY, updateSettings]);

  const handleToggleCameraAssist = useCallback(() => {
    soundManager.playUiClick();
    updateSettings({ cameraAssist: !settings.cameraAssist });
  }, [settings.cameraAssist, updateSettings]);

  const handleGraphicsQuality = useCallback(
    (quality: 'high' | 'low') => {
      soundManager.playUiClick();
      updateSettings({ graphicsQuality: quality });
    },
    [updateSettings]
  );

  const handleResetBindings = useCallback(() => {
    soundManager.playUiClick();
    updateSettings({ keyBindings: { ...DEFAULT_KEY_BINDINGS } });
    setConflictNotice(null);
  }, [updateSettings]);

  // Key listening for rebinding or Esc to close
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (rebindingAction) {
        e.preventDefault();
        e.stopPropagation();

        if (e.code === 'Escape') {
          setRebindingAction(null);
          setConflictNotice(null);
          return;
        }

        const newCode = e.code;
        const currentBindings = { ...settings.keyBindings };

        // Check if newCode is already assigned to another action
        let conflictAction: string | null = null;
        for (const [actionKey, boundCode] of Object.entries(currentBindings)) {
          if (actionKey !== rebindingAction && boundCode === newCode) {
            conflictAction = BINDING_LABELS[actionKey as keyof KeyBindings];
            break;
          }
        }

        if (conflictAction) {
          setConflictNotice(
            `Key "${formatKeyLabel(newCode)}" is already bound to "${conflictAction}". Both actions share this key.`
          );
        } else {
          setConflictNotice(null);
        }

        currentBindings[rebindingAction] = newCode;
        soundManager.playUiClick();
        updateSettings({ keyBindings: currentBindings });
        setRebindingAction(null);
        return;
      }

      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isSettingsOpen, rebindingAction, settings.keyBindings, updateSettings, closeSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900/95 border-2 border-sky-500/50 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-[0_0_60px_rgba(56,189,248,0.25)] text-white flex flex-col gap-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h2 className="text-2xl font-black tracking-wide bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                SETTINGS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controls, camera look, key bindings, audio and graphics
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

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              soundManager.playUiClick();
              setActiveTab('controls');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Camera & Mode
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playUiClick();
              setActiveTab('bindings');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'bindings'
                ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Key Bindings
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playUiClick();
              setActiveTab('audio');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'audio'
                ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Audio & Graphics
          </button>
        </div>

        {/* Tab 1: Controls & Camera */}
        {activeTab === 'controls' && (
          <div className="space-y-4 animate-in fade-in duration-100">
            {/* Control Mode Choice */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-white/10 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Control Mode
                </span>
                <span className="text-[11px] text-sky-400 font-semibold">
                  {settings.controlMode === 'camera-relative' ? 'Genshin Style' : 'Tank Style'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleControlMode('camera-relative')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left flex flex-col gap-1 ${
                    settings.controlMode === 'camera-relative'
                      ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md shadow-sky-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-black">Camera-Relative</span>
                  <span className="text-[10px] normal-case opacity-90">
                    WASD moves relative to view · Pointer lock mouse orbit
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleControlMode('classic')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-left flex flex-col gap-1 ${
                    settings.controlMode === 'classic'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-black">Classic Mode</span>
                  <span className="text-[10px] normal-case opacity-90">
                    W thrusts forward · A/D steers rudder · Free cursor
                  </span>
                </button>
              </div>
            </div>

            {/* Mouse Sensitivity Slider */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-white/10 space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Mouse Look Sensitivity</span>
                <span className="font-mono text-sky-400 font-bold">
                  {(settings.mouseSensitivity ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={settings.mouseSensitivity ?? 1.0}
                onChange={(e) => handleSensitivity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Invert Y & Camera Assist Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-slate-800/60 p-3.5 rounded-2xl border border-white/10">
                <div>
                  <div className="text-xs font-bold text-slate-200">Invert Y Axis</div>
                  <div className="text-[11px] text-slate-400">Flight pitch control</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleInvertY}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    settings.invertY
                      ? 'bg-sky-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.invertY ? 'Inverted' : 'Standard'}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-800/60 p-3.5 rounded-2xl border border-white/10">
                <div>
                  <div className="text-xs font-bold text-slate-200">Camera Assist</div>
                  <div className="text-[11px] text-slate-400">Auto-aligns in races when idle</div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleCameraAssist}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    settings.cameraAssist
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.cameraAssist ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Key Bindings */}
        {activeTab === 'bindings' && (
          <div className="space-y-3 animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>Click any action to rebind. Press <kbd className="font-mono text-amber-300">Esc</kbd> to cancel.</span>
              <button
                type="button"
                onClick={handleResetBindings}
                className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                Reset to Defaults
              </button>
            </div>

            {/* Conflict Warning */}
            {conflictNotice && (
              <div className="p-3 bg-amber-500/15 border border-amber-400/40 rounded-xl text-xs text-amber-300 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{conflictNotice}</span>
              </div>
            )}

            {/* Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[46vh] overflow-y-auto pr-1">
              {(Object.keys(BINDING_LABELS) as Array<keyof KeyBindings>).map((actionKey) => {
                const label = BINDING_LABELS[actionKey];
                const currentKey = settings.keyBindings?.[actionKey] || DEFAULT_KEY_BINDINGS[actionKey];
                const isRebinding = rebindingAction === actionKey;

                return (
                  <div
                    key={actionKey}
                    className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-white/5 text-xs"
                  >
                    <span className="font-medium text-slate-300">{label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playUiClick();
                        setRebindingAction(actionKey);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono font-bold uppercase transition-all cursor-pointer ${
                        isRebinding
                          ? 'bg-amber-400 text-slate-950 animate-pulse ring-2 ring-amber-300'
                          : 'bg-slate-900 border border-slate-700 text-sky-300 hover:border-sky-400 hover:bg-slate-800'
                      }`}
                    >
                      {isRebinding ? 'Press Key...' : formatKeyLabel(currentKey)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Audio & Graphics */}
        {activeTab === 'audio' && (
          <div className="space-y-4 animate-in fade-in duration-100">
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
        )}

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
