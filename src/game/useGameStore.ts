import { create } from 'zustand';

export type RacePhase = 'idle' | 'countdown' | 'racing' | 'finished';

export interface GameStoreState {
  phase: RacePhase;
  raceStartTime: number | null;
  finishTime: number | null;
  bestTime: number | null;
  nextCheckpoint: number;
  trackId: string;

  // Actions
  startCountdown: () => void;
  startRace: () => void;
  hitCheckpoint: (index: number) => void;
  finish: (time: number) => void;
  restart: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  phase: 'idle',
  raceStartTime: null,
  finishTime: null,
  bestTime: null,
  nextCheckpoint: 0,
  trackId: 'river-01',

  startCountdown: () => set({ phase: 'countdown' }),
  startRace: () => set({ phase: 'racing', raceStartTime: performance.now() }),
  hitCheckpoint: (index) => set({ nextCheckpoint: index + 1 }),
  finish: (time) => set({ phase: 'finished', finishTime: time }),
  restart: () =>
    set({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
    }),
}));

