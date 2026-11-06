import { create } from 'zustand';
import { GAME_CONSTANTS } from './constants';
import { river01 } from './tracks/river01';

export type GameMode = 'hub' | 'race';
export type RacePhase = 'idle' | 'countdown' | 'racing' | 'finished';

export interface GameStoreState {
  mode: GameMode;
  phase: RacePhase;
  raceStartTime: number | null;
  finishTime: number | null;
  bestTime: number | null;
  nextCheckpoint: number;
  trackId: string;
  runId: number;
  playerRank: number;

  // Dialogue state (Milestone 10)
  isDialogueOpen: boolean;
  dialogueIndex: number;
  selectedChoiceIndex: number;
  isNearNpc: boolean;

  // Actions
  setMode: (mode: GameMode) => void;
  startRaceFromHub: () => void;
  returnToHub: () => void;
  openDialogue: () => void;
  advanceDialogue: () => void;
  selectChoice: (index: number) => void;
  closeDialogue: () => void;
  setIsNearNpc: (near: boolean) => void;

  startCountdown: () => void;
  startRace: () => void;
  hitCheckpoint: (index: number) => void;
  finish: (time: number, rank?: number) => void;
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
  mode: 'hub', // Game starts in 'hub' (Milestone 10 Requirement 1)
  phase: 'idle',
  raceStartTime: null,
  finishTime: null,
  bestTime: loadStoredBestTime('river-01'),
  nextCheckpoint: 0,
  trackId: 'river-01',
  runId: 0,
  playerRank: 1,

  isDialogueOpen: false,
  dialogueIndex: 0,
  selectedChoiceIndex: 0,
  isNearNpc: false,

  setMode: (mode: GameMode) => set({ mode }),

  startRaceFromHub: () =>
    set((state) => ({
      mode: 'race',
      phase: 'idle',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: state.runId + 1,
      playerRank: 1,
      isDialogueOpen: false,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    })),

  returnToHub: () =>
    set((state) => ({
      mode: 'hub',
      phase: 'idle',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: state.runId + 1,
      isDialogueOpen: false,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    })),

  openDialogue: () =>
    set({
      isDialogueOpen: true,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    }),

  advanceDialogue: () =>
    set((state) => ({
      dialogueIndex: state.dialogueIndex + 1,
      selectedChoiceIndex: 0,
    })),

  selectChoice: (index: number) =>
    set({
      selectedChoiceIndex: index,
    }),

  closeDialogue: () =>
    set({
      isDialogueOpen: false,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    }),

  setIsNearNpc: (near: boolean) =>
    set({
      isNearNpc: near,
    }),

  startCountdown: () =>
    set((state) => ({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: state.runId + 1,
      playerRank: 1,
    })),

  startRace: () =>
    set({
      phase: 'racing',
      raceStartTime: performance.now(),
    }),

  hitCheckpoint: (index: number) =>
    set({
      nextCheckpoint: index + 1,
    }),

  finish: (time: number, rank = 1) => {
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
      playerRank: rank,
      nextCheckpoint: river01.checkpoints.length,
    });
  },

  restart: () => {
    const state = get();
    if (state.mode === 'hub') {
      // In hub, R returns the otter to the hub spawn point
      set((s) => ({
        runId: s.runId + 1,
        isDialogueOpen: false,
      }));
      return;
    }

    // In race, R restarts countdown
    const currentBest = loadStoredBestTime(state.trackId);
    set((s) => ({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: s.runId + 1,
      playerRank: 1,
      bestTime: currentBest ?? state.bestTime,
    }));
  },
}));
