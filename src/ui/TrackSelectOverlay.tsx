'use client';

import React, { useEffect, useCallback } from 'react';
import { useGameStore } from '../game/useGameStore';
import { TRACK_LIST } from '../game/tracks/registry';
import { formatTime } from './Hud';

/**
 * TrackSelectOverlay Component (Milestone 11)
 * Displays available and locked tracks with best times, lock status, and unlock criteria.
 * Choosing an unlocked track starts the race from the Hub.
 */
export function TrackSelectOverlay() {
  const isTrackSelectOpen = useGameStore((state) => state.isTrackSelectOpen);
  const unlockedTracks = useGameStore((state) => state.unlockedTracks);
  const bestTimes = useGameStore((state) => state.bestTimes);
  const activeTrackId = useGameStore((state) => state.activeTrackId);

  const closeTrackSelect = useGameStore((state) => state.closeTrackSelect);
  const startRaceFromHub = useGameStore((state) => state.startRaceFromHub);

  const handleSelectAndRace = useCallback(
    (trackId: string) => {
      if (!unlockedTracks.includes(trackId)) return;
      startRaceFromHub(trackId);
    },
    [unlockedTracks, startRaceFromHub]
  );

  // Keyboard navigation: Esc to close, 1 & 2 number keys to select
  useEffect(() => {
    if (!isTrackSelectOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        closeTrackSelect();
      } else if (e.code === 'Digit1' || e.key === '1') {
        e.preventDefault();
        handleSelectAndRace('river-01');
      } else if (e.code === 'Digit2' || e.key === '2') {
        e.preventDefault();
        if (unlockedTracks.includes('river-02')) {
          handleSelectAndRace('river-02');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isTrackSelectOpen, unlockedTracks, handleSelectAndRace, closeTrackSelect]);

  if (!isTrackSelectOpen) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_60px_rgba(16,185,129,0.25)] text-white flex flex-col gap-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗺️</span>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-wide bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                SELECT TRACK
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose a river course to challenge with the river racers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeTrackSelect}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Track List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TRACK_LIST.map((track, idx) => {
            const isUnlocked = unlockedTracks.includes(track.id);
            const isSelected = track.id === activeTrackId;
            const bestTimeMs = bestTimes[track.id];

            return (
              <div
                key={track.id}
                className={`relative rounded-2xl p-5 border-2 flex flex-col justify-between gap-4 transition-all ${
                  isUnlocked
                    ? isSelected
                      ? 'bg-slate-800/90 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800/80'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                }`}
              >
                {/* Track Card Top */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                        Track 0{idx + 1}
                      </span>
                      <h3 className="text-lg font-black text-white">{track.name}</h3>
                    </div>
                    {isUnlocked ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Available
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <span>🔒</span> Locked
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                    {track.description || 'Scenic river course with checkpoints and currents.'}
                  </p>

                  {/* Track Specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/10 text-slate-400">
                    <div>
                      Checkpoints: <span className="font-mono text-slate-200 font-bold">{track.checkpoints.length}</span>
                    </div>
                    <div>
                      Currents: <span className="font-mono text-slate-200 font-bold">{track.currents.length}</span>
                    </div>
                  </div>

                  {/* Best Record */}
                  <div className="bg-slate-900/80 rounded-xl p-2.5 border border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Best Time:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {bestTimeMs ? formatTime(bestTimeMs) : 'No record yet'}
                    </span>
                  </div>
                </div>

                {/* Unlock Requirements or Race Action */}
                <div className="pt-2">
                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => handleSelectAndRace(track.id)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Race Track [{idx + 1}]</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-center space-y-1">
                      <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                        How to Unlock
                      </div>
                      <div className="text-xs text-rose-200 font-medium">
                        {track.unlockCondition || 'Finish Calm Bend in top 3 to unlock'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <span>Press <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono font-bold">Esc</kbd> to return to pond</span>
          <button
            type="button"
            onClick={closeTrackSelect}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            ← Back to Pond
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrackSelectOverlay;

