'use client';

import React, { useEffect, useRef } from 'react';
import { MovementTunables } from '../game/constants';
import { otterTelemetry } from '../game/telemetry';

interface Milestone1HudProps {
  tunables: MovementTunables;
}

export function Milestone1Hud({ tunables }: Milestone1HudProps) {
  const speedTextRef = useRef<HTMLSpanElement>(null);
  const cruiseRefTextRef = useRef<HTMLSpanElement>(null);
  const headingTextRef = useRef<HTMLSpanElement>(null);
  const dashStatusRef = useRef<HTMLSpanElement>(null);
  const dashBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;
    let lastUpdate = 0;

    const updateLoop = (timestamp: number) => {
      // Update approximately 15-20 times per second (Section 6.6)
      if (timestamp - lastUpdate > 50) {
        lastUpdate = timestamp;

        if (speedTextRef.current) {
          speedTextRef.current.textContent = otterTelemetry.speed.toFixed(1);
        }

        const currentCruiseSpeed = (tunables.accel / tunables.drag).toFixed(1);
        if (cruiseRefTextRef.current) {
          cruiseRefTextRef.current.textContent = currentCruiseSpeed;
        }

        if (headingTextRef.current) {
          headingTextRef.current.textContent = `${Math.round(otterTelemetry.headingDeg)}°`;
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
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [tunables]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 select-none font-sans text-white">
      {/* Top Banner */}
      <header className="flex items-center justify-between">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/10 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦦</span>
            <div>
              <h1 className="text-lg font-black tracking-wide bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                OTTER RUN
              </h1>
              <p className="text-xs text-slate-400 font-medium">Milestone 1 · Scene & Movement</p>
            </div>
          </div>
        </div>

        {/* Leva indicator */}
        <div className="hidden sm:block text-xs bg-slate-900/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 text-slate-300">
          ⚙️ Use the <span className="text-sky-300 font-semibold">Leva panel</span> on the right to tune movement live
        </div>
      </header>

      {/* Bottom Telemetry and Controls */}
      <footer className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        {/* Controls Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 max-w-md shadow-xl">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Controls</h2>
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
              <span>Reset position to origin</span>
            </div>
          </div>
        </div>

        {/* Live Telemetry Card */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl flex flex-col gap-3 justify-self-end w-full max-w-sm">
          <div className="flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Speed</span>
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
