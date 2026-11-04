import { create } from 'zustand';
import { GAME_CONSTANTS } from './constants';

export type RacePhase = 'idle' | 'countdown' | 'racing' | 'finished';

export interface GameStoreState {
  // Store only the exact properties required by Section 6.7
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

function getStorageKey(trackId: string): string {
  return `${GAME_CONSTANTS.BEST_TIME_STORAGE_PREFIX}${trackId}`;
}

function loadStoredBestTime(trackId: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(trackId));
    if (raw) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load best time from localStorage:', err);
  }
  return null;
}

function saveStoredBestTime(trackId: string, time: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(trackId), time.toString());
  } catch (err) {
    console.warn('Failed to save best time to localStorage:', err);
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  phase: 'countdown', // Starts in countdown on load/restart (Section 6.5)
  raceStartTime: null,
  finishTime: null,
  bestTime: loadStoredBestTime('river-01'),
  nextCheckpoint: 0,
  trackId: 'river-01',

  startCountdown: () =>
    set({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
    }),

  startRace: () =>
    set({
      phase: 'racing',
      raceStartTime: performance.now(),
    }),

  hitCheckpoint: (index: number) =>
    set({
      nextCheckpoint: index + 1,
    }),

  finish: (time: number) => {
    const state = get();
    const isNewBest = state.bestTime === null || time < state.bestTime;
    const finalBest = isNewBest ? time : state.bestTime;

    if (isNewBest) {
      saveStoredBestTime(state.trackId, time);
    }

    set({
      phase: 'finished',
      finishTime: time,
      bestTime: finalBest,
      nextCheckpoint: 4, // All checkpoints completed
    });
  },

  restart: () => {
    const state = get();
    // Reload best time from storage in case it updated
    const currentBest = loadStoredBestTime(state.trackId);
    set({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      bestTime: currentBest ?? state.bestTime,
    });
  },
}));
