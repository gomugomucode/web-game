'use client';

import dynamic from 'next/dynamic';

const Game = dynamic(() => import('@/game/Game'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl animate-bounce">🦦</span>
        <span className="text-xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
          Loading Otter Run...
        </span>
      </div>
      <p className="text-xs text-slate-400">Initializing 3D river environment</p>
    </div>
  ),
});

export default function Page() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <Game />
    </main>
  );
}
