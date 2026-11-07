'use client';

import React, { useEffect, useRef } from 'react';
import { MovementTunables } from '../game/constants';
import { otterTelemetry } from '../game/telemetry';
import { useGameStore } from '../game/useGameStore';
import { getTrack } from '../game/tracks/registry';

interface HudProps {
  tunables: MovementTunables;
}

export function formatTime(ms: number | null): string {
  if (ms === null || ms < 0 || isNaN(ms)) return '00:00.000';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${mm}:${ss}.${mmm}`;
}

export function Hud({ tunables }: HudProps) {
  // Slow state from zustand for UI panels
  const mode = useGameStore((state) => state.mode);
  const phase = useGameStore((state) => state.phase);
  const nextCheckpoint = useGameStore((state) => state.nextCheckpoint);
  const finishTime = useGameStore((state) => state.finishTime);
  const bestTime = useGameStore((state) => state.bestTime);
  const playerRank = useGameStore((state) => state.playerRank);
  const activeTrackId = useGameStore((state) => state.activeTrackId);
  const restart = useGameStore((state) => state.restart);
  const startCountdown = useGameStore((state) => state.startCountdown);
  const returnToHub = useGameStore((state) => state.returnToHub);

  const activeTrack = getTrack(activeTrackId);

  // High-frequency DOM references updated in rAF loop (zero React tree re-renders)
  const timerTextRef = useRef<HTMLSpanElement>(null);
  const speedTextRef = useRef<HTMLSpanElement>(null);
  const cruiseRefTextRef = useRef<HTMLSpanElement>(null);
  const headingTextRef = useRef<HTMLSpanElement>(null);
  const checkpointTextRef = useRef<HTMLSpanElement>(null);
  const positionTextRef = useRef<HTMLSpanElement>(null);
  const dashStatusRef = useRef<HTMLSpanElement>(null);
  const dashBarRef = useRef<HTMLDivElement>(null);
  const inCurrentBadgeRef = useRef<HTMLSpanElement>(null);

  // Dev overlay DOM refs (Milestone 9: F3 Toggle)
  const devOverlayRef = useRef<HTMLDivElement>(null);
  const devFpsRef = useRef<HTMLSpanElement>(null);
  const devCallsRef = useRef<HTMLSpanElement>(null);
  const devTrianglesRef = useRef<HTMLSpanElement>(null);
  const devVisibleRef = useRef<boolean>(false);

  // Countdown overlay DOM refs
  const countdownOverlayRef = useRef<HTMLDivElement>(null);
  const countdownTextRef = useRef<HTMLSpanElement>(null);

  const countdownStartTimeRef = useRef<number | null>(null);
  const lastRunIdRef = useRef<number>(-1);

  // Global keyboard shortcuts for R (restart) and Space/Enter (ready screen start)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a form or input field
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyR' || e.key.toLowerCase() === 'r') {
        useGameStore.getState().restart();
      } else if (e.code === 'F3' || e.key === 'F3') {
        e.preventDefault();
        devVisibleRef.current = !devVisibleRef.current;
        if (devOverlayRef.current) {
          devOverlayRef.current.style.display = devVisibleRef.current ? 'block' : 'none';
        }
      } else if (
        (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') &&
        useGameStore.getState().mode === 'race' &&
        useGameStore.getState().phase === 'idle'
      ) {
        e.preventDefault();
        useGameStore.getState().startCountdown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let animId: number;
    let lastUpdate = 0;

    const updateLoop = (timestamp: number) => {
      const gameState = useGameStore.getState();

      // Clear countdown ref whenever runId changes so countdown restarts cleanly
      if (gameState.runId !== lastRunIdRef.current) {
        lastRunIdRef.current = gameState.runId;
        countdownStartTimeRef.current = null;
      }

      // --- 1. Countdown Phase Handling (Requirement 1: 3, 2, 1, GO - Race mode only) ---
      if (gameState.mode === 'race' && gameState.phase === 'countdown') {
        if (countdownStartTimeRef.current === null) {
          countdownStartTimeRef.current = timestamp;
        }

        const elapsedCd = (timestamp - countdownStartTimeRef.current) / 1000;

        if (countdownOverlayRef.current && countdownTextRef.current) {
          countdownOverlayRef.current.style.display = 'flex';

          if (elapsedCd < 1.0) {
            countdownTextRef.current.textContent = '3';
            countdownTextRef.current.className =
              'text-8xl sm:text-9xl font-black text-amber-400 drop-shadow-[0_10px_20px_rgba(245,158,11,0.5)] scale-110 transition-transform';
          } else if (elapsedCd < 2.0) {
            countdownTextRef.current.textContent = '2';
            countdownTextRef.current.className =
              'text-8xl sm:text-9xl font-black text-amber-300 drop-shadow-[0_10px_20px_rgba(252,211,77,0.5)] scale-110 transition-transform';
          } else if (elapsedCd < 3.0) {
            countdownTextRef.current.textContent = '1';
            countdownTextRef.current.className =
              'text-8xl sm:text-9xl font-black text-sky-400 drop-shadow-[0_10px_20px_rgba(56,189,248,0.5)] scale-110 transition-transform';
          } else {
            // Countdown complete: switch to racing phase
            countdownStartTimeRef.current = null;
            gameState.startRace();
          }
        }
      } else if (gameState.mode === 'race' && gameState.phase === 'racing') {
        // Show "GO!" for the first 0.8s of racing
        if (gameState.raceStartTime && timestamp - gameState.raceStartTime < 800) {
          if (countdownOverlayRef.current && countdownTextRef.current) {
            countdownOverlayRef.current.style.display = 'flex';
            countdownTextRef.current.textContent = 'GO!';
            countdownTextRef.current.className =
              'text-8xl sm:text-9xl font-black text-emerald-400 drop-shadow-[0_10px_25px_rgba(16,185,129,0.7)] animate-pulse';
          }
        } else {
          if (countdownOverlayRef.current) {
            countdownOverlayRef.current.style.display = 'none';
          }
        }
      } else {
        countdownStartTimeRef.current = null;
        if (countdownOverlayRef.current) {
          countdownOverlayRef.current.style.display = 'none';
        }
      }

      // --- 2. Live Timer Display (Race mode only) ---
      if (timerTextRef.current) {
        if (gameState.mode === 'race' && gameState.phase === 'racing' && gameState.raceStartTime) {
          const elapsed = performance.now() - gameState.raceStartTime;
          timerTextRef.current.textContent = formatTime(elapsed);
        } else if (gameState.mode === 'race' && gameState.phase === 'finished' && gameState.finishTime !== null) {
          timerTextRef.current.textContent = formatTime(gameState.finishTime);
        } else {
          timerTextRef.current.textContent = '00:00.000';
        }
      }

      // --- 3. Telemetry Readouts (Speed, Dash, Heading, Checkpoint Counter) ---
      if (timestamp - lastUpdate > 45) {
        lastUpdate = timestamp;

        if (speedTextRef.current) {
          speedTextRef.current.textContent = otterTelemetry.speed.toFixed(1);
        }

        if (inCurrentBadgeRef.current) {
          inCurrentBadgeRef.current.style.display = otterTelemetry.inCurrent ? 'inline-block' : 'none';
        }

        const currentCruiseSpeed = (tunables.accel / tunables.drag).toFixed(1);
        if (cruiseRefTextRef.current) {
          cruiseRefTextRef.current.textContent = currentCruiseSpeed;
        }

        if (headingTextRef.current) {
          headingTextRef.current.textContent = `${Math.round(otterTelemetry.headingDeg)}°`;
        }

        if (checkpointTextRef.current) {
          const currentTrack = getTrack(useGameStore.getState().activeTrackId);
          checkpointTextRef.current.textContent = `${gameState.nextCheckpoint} / ${currentTrack.checkpoints.length}`;
        }

        if (positionTextRef.current) {
          const rank = otterTelemetry.playerRank;
          const ordinal = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : '4th';
          positionTextRef.current.textContent = `${ordinal} / 4`;
          if (rank === 1) {
            positionTextRef.current.className = 'text-2xl sm:text-3xl font-black font-mono text-amber-400';
          } else if (rank === 2) {
            positionTextRef.current.className = 'text-2xl sm:text-3xl font-black font-mono text-slate-200';
          } else if (rank === 3) {
            positionTextRef.current.className = 'text-2xl sm:text-3xl font-black font-mono text-amber-600';
          } else {
            positionTextRef.current.className = 'text-2xl sm:text-3xl font-black font-mono text-slate-400';
          }
        }

        if (dashStatusRef.current && dashBarRef.current) {
          if (otterTelemetry.isDashing) {
            dashStatusRef.current.textContent = 'BOOSTING!';
            dashStatusRef.current.className = 'text-amber-400 font-bold';
            dashBarRef.current.style.width = '100%';
            dashBarRef.current.className = 'h-full bg-amber-400 transition-all duration-75';
          } else if (otterTelemetry.dashCooldownRemaining > 0) {
            const pct = Math.max(
              0,
              1 - otterTelemetry.dashCooldownRemaining / tunables.dashCooldown
            );
            dashStatusRef.current.textContent = `${otterTelemetry.dashCooldownRemaining.toFixed(1)}s`;
            dashStatusRef.current.className = 'text-sky-300 font-mono';
            dashBarRef.current.style.width = `${pct * 100}%`;
            dashBarRef.current.className = 'h-full bg-sky-500/80 transition-all duration-75';
          } else {
            dashStatusRef.current.textContent = 'READY (Space)';
            dashStatusRef.current.className = 'text-emerald-400 font-bold';
            dashBarRef.current.style.width = '100%';
            dashBarRef.current.className = 'h-full bg-emerald-400 transition-all duration-75';
          }
        }

        // Dev Overlay Stats (Milestone 9)
        if (devVisibleRef.current) {
          if (devFpsRef.current) devFpsRef.current.textContent = String(otterTelemetry.fps);
          if (devCallsRef.current) devCallsRef.current.textContent = String(otterTelemetry.drawCalls);
          if (devTrianglesRef.current) devTrianglesRef.current.textContent = otterTelemetry.triangles.toLocaleString();
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [tunables]);

  const isNewBest =
    finishTime !== null && bestTime !== null && finishTime <= bestTime;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 select-none font-sans text-white">
      {/* Dev Overlay (Milestone 9: F3 Toggle) */}
      <div
        ref={devOverlayRef}
        style={{ display: 'none' }}
        className="pointer-events-auto absolute top-24 left-6 z-30 bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 font-mono text-xs shadow-2xl backdrop-blur-md text-slate-200 min-w-[220px]"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <span className="font-bold text-emerald-400 tracking-wider">DEV STATS (F3)</span>
          <span className="text-[10px] text-slate-500">REALTIME</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">FPS:</span>
            <span ref={devFpsRef} className="font-bold text-emerald-400">60</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Draw Calls:</span>
            <span ref={devCallsRef} className="font-bold text-sky-400">0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Triangles:</span>
            <span ref={devTrianglesRef} className="font-bold text-amber-300">0</span>
          </div>
        </div>
      </div>

      {/* Top Banner & Timer Display */}
      <header className="flex items-start justify-between w-full">
        {/* Track Title Card */}
        <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦦</span>
            <div>
              <h1 className="text-lg font-black tracking-wide bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                OTTER RUN
              </h1>
              <p className="text-xs text-emerald-400 font-medium">
                {mode === 'hub' ? 'Otter Haven (Hub)' : activeTrack.name}
              </p>
            </div>
          </div>
        </div>

        {/* Center Timer Display & Right Header Stats (Race mode only) */}
        {mode === 'race' && (
          <>
            <div className="flex flex-col items-center">
              <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-6 py-2.5 border border-white/15 shadow-2xl flex items-center gap-3">
                <span className="text-sm font-bold text-sky-400 tracking-wider uppercase">Time</span>
                <span
                  ref={timerTextRef}
                  className="font-mono text-3xl sm:text-4xl font-black text-amber-300 tracking-tight"
                >
                  00:00.000
                </span>
              </div>
              {bestTime !== null && (
                <div className="mt-1 text-[11px] font-mono text-slate-300 bg-slate-900/70 px-3 py-0.5 rounded-full border border-white/10">
                  Best: <span className="text-amber-400 font-bold">{formatTime(bestTime)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Live Position Indicator (Milestone 8) */}
              <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-xl flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Position
                </span>
                <span
                  ref={positionTextRef}
                  className="text-2xl sm:text-3xl font-black font-mono text-amber-400"
                >
                  1st / 4
                </span>
              </div>

              {/* Checkpoint Counter (Requirement 4) */}
              <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-xl flex flex-col items-end">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Checkpoints
                </span>
                <span
                  ref={checkpointTextRef}
                  className="text-2xl sm:text-3xl font-black font-mono text-sky-400"
                >
                  {nextCheckpoint} / {activeTrack.checkpoints.length}
                </span>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Countdown Overlay (Requirement 1: 3, 2, 1, GO - Race mode only) */}
      <div
        ref={countdownOverlayRef}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ display: 'none' }}
      >
        <span ref={countdownTextRef} className="text-9xl font-black" />
      </div>

      {/* Ready Screen Overlay (Race mode only) */}
      {mode === 'race' && phase === 'idle' && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border-2 border-sky-500/50 rounded-3xl p-8 max-w-lg w-full mx-4 shadow-[0_0_50px_rgba(56,189,248,0.25)] text-center flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🦦</span>
              <div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-wide bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  OTTER RUN
                </h2>
                <p className="text-sm text-emerald-400 font-semibold mt-0.5">{activeTrack.name}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              {activeTrack.description || 'Navigate the winding river, glide through the checkpoint arches, and race for the best time!'}
            </p>

            <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-white/10 space-y-2 text-xs text-slate-300 text-left">
              <div className="font-bold text-sky-400 uppercase tracking-wider text-[11px] mb-2">Controls Overview</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Swim & Steer</span>
                <span className="font-mono text-amber-300 font-bold">W / A / S / D  or  Arrow Keys</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dash Boost</span>
                <span className="font-mono text-amber-300 font-bold">Space</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restart Race</span>
                <span className="font-mono text-amber-300 font-bold">R (anytime)</span>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={() => startCountdown()}
                className="w-full py-4 px-8 bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 hover:from-sky-400 hover:via-teal-300 hover:to-emerald-300 text-slate-950 font-black text-lg uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer"
              >
                Start Race
              </button>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                Press <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono font-bold">Enter</kbd> or <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono font-bold">Space</kbd> to begin
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Finish Results Panel (Requirement 5 & 6 & Milestone 8) */}
      {phase === 'finished' && finishTime !== null && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🏁</span>
              <h2 className="text-2xl font-black text-white tracking-wide">RACE FINISHED!</h2>
            </div>

            {/* Position Award Banner */}
            <div
              className={`px-4 py-1.5 font-black text-xs uppercase tracking-widest rounded-full shadow-lg ${
                playerRank === 1
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 animate-bounce'
                  : 'bg-slate-800 text-sky-300 border border-white/10'
              }`}
            >
              {playerRank === 1
                ? '★ 1ST PLACE VICTORY! ★'
                : `FINISHED ${playerRank === 2 ? '2ND' : playerRank === 3 ? '3RD' : '4TH'} OF 4`}
            </div>

            {isNewBest && (
              <div className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow-lg">
                ★ NEW BEST TIME! ★
              </div>
            )}

            <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Final Position
                </span>
                <span className="font-mono text-3xl font-black text-amber-400">
                  {playerRank === 1 ? '1st' : playerRank === 2 ? '2nd' : playerRank === 3 ? '3rd' : '4th'} / 4
                </span>
              </div>
              <div className="h-px bg-slate-700/60 w-full" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Total Time
                </span>
                <span className="font-mono text-3xl font-black text-emerald-400">
                  {formatTime(finishTime)}
                </span>
              </div>
              <div className="h-px bg-slate-700/60 w-full" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Best Record
                </span>
                <span className="font-mono text-xl font-bold text-amber-300">
                  {formatTime(bestTime)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 w-full">
              <button
                type="button"
                onClick={() => restart()}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Race Again (Press R)
              </button>
              <button
                type="button"
                onClick={() => returnToHub()}
                className="w-full py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-sky-400/30 shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>←</span>
                <span>Return to Hub</span>
              </button>
              <p className="text-xs text-slate-400">
                Steering locked while coasting · Press <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono font-bold">R</kbd> to restart anytime
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Telemetry and Controls */}
      <footer className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        {/* Controls Card */}
        <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl p-4 border border-white/10 max-w-md shadow-xl">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Controls</h2>
            <span className="text-[11px] text-sky-400 font-medium">
              {mode === 'hub'
                ? 'Otter Haven Pond'
                : phase === 'idle'
                ? 'Ready to start'
                : phase === 'countdown'
                ? 'Input locked during countdown'
                : phase === 'finished'
                ? 'Coasting'
                : 'Racing active'}
            </span>
          </div>
          {mode === 'hub' ? (
            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">W / ↑</kbd>
                <span>Swim forward</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">S / ↓</kbd>
                <span>Brake (no reverse)</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">A / D / ← →</kbd>
                <span>Steer & drift</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">Space</kbd>
                <span>Dash impulse</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-300">
                <kbd className="px-2 py-1 bg-emerald-950/80 rounded border border-emerald-500/50 font-mono text-emerald-300 font-bold">E</kbd>
                <span>Talk with Elder Moss</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-slate-300">R</kbd>
                <span>Reset to spawn</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-200">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">W / ↑</kbd>
                <span>Swim forward</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">S / ↓</kbd>
                <span>Brake (no reverse)</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">A / D / ← →</kbd>
                <span>Steer (drift in turns)</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-amber-300 font-bold">Space</kbd>
                <span>Dash impulse</span>
              </div>
              <div className="flex items-center gap-2 col-span-2 text-slate-400">
                <kbd className="px-2 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-slate-300">R</kbd>
                <span>Restart race at any time</span>
              </div>
            </div>
          )}
        </div>

        {/* Live Telemetry Card (Speed & Dash Cooldown) */}
        <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col gap-3 justify-self-end w-full max-w-sm">
          <div className="flex justify-between items-baseline">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Speed</span>
              <span
                ref={inCurrentBadgeRef}
                style={{ display: 'none' }}
                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md animate-pulse"
              >
                IN CURRENT
              </span>
            </div>
            <div className="text-right">
              <span ref={speedTextRef} className="text-3xl font-black font-mono text-sky-400">0.0</span>
              <span className="text-xs text-slate-400 ml-1">m/s</span>
              <div className="text-[11px] text-slate-400">
                Cruise target: ~<span ref={cruiseRefTextRef} className="font-mono text-slate-300">{(tunables.accel / tunables.drag).toFixed(1)}</span> m/s
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-300">
            <span className="text-slate-400">Heading:</span>
            <span ref={headingTextRef} className="font-mono font-bold text-slate-200">0°</span>
          </div>

          {/* Dash Cooldown Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 font-medium">Dash</span>
              <span ref={dashStatusRef} className="text-emerald-400 font-bold">READY (Space)</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div ref={dashBarRef} className="h-full bg-emerald-400 w-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Hud;

