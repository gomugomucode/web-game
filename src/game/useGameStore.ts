import { create } from 'zustand';
import { getTrack } from './tracks/registry';
import {
  loadSaveData,
  saveTrackRecord,
  updateDialogueFlags,
  SaveFlags,
} from './saveSystem';

export type GameMode = 'hub' | 'race';
export type RacePhase = 'idle' | 'countdown' | 'racing' | 'finished';

export interface GameStoreState {
  mode: GameMode;
  phase: RacePhase;
  raceStartTime: number | null;
  finishTime: number | null;
  bestTime: number | null;
  nextCheckpoint: number;
  activeTrackId: string;
  runId: number;
  playerRank: number;

  // Progression & Save State (Milestone 11)
  unlockedTracks: string[];
  bestTimes: Record<string, number>;
  flags: SaveFlags;
  isTrackSelectOpen: boolean;

  // Dialogue state (Milestone 10 & 11)
  isDialogueOpen: boolean;
  dialogueIndex: number;
  selectedChoiceIndex: number;
  isNearNpc: boolean;

  // Actions
  setMode: (mode: GameMode) => void;
  selectTrack: (trackId: string) => void;
  openTrackSelect: () => void;
  closeTrackSelect: () => void;
  startRaceFromHub: (trackId?: string) => void;
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

const initialSave = loadSaveData();
const initialTrackId = 'river-01';

export const useGameStore = create<GameStoreState>((set, get) => ({
  mode: 'hub', // Game starts in 'hub'
  phase: 'idle',
  raceStartTime: null,
  finishTime: null,
  bestTime: initialSave.bestTimes[initialTrackId] ?? null,
  nextCheckpoint: 0,
  activeTrackId: initialTrackId,
  runId: 0,
  playerRank: 1,

  // Progression & Save Data
  unlockedTracks: initialSave.unlockedTracks,
  bestTimes: initialSave.bestTimes,
  flags: initialSave.flags,
  isTrackSelectOpen: false,

  // Dialogue
  isDialogueOpen: false,
  dialogueIndex: 0,
  selectedChoiceIndex: 0,
  isNearNpc: false,

  setMode: (mode: GameMode) => set({ mode }),

  selectTrack: (trackId: string) => {
    const state = get();
    const track = getTrack(trackId);
    set({
      activeTrackId: track.id,
      bestTime: state.bestTimes[track.id] ?? null,
      isTrackSelectOpen: false,
      nextCheckpoint: 0,
    });
  },

  openTrackSelect: () =>
    set({
      isTrackSelectOpen: true,
      isDialogueOpen: false,
    }),

  closeTrackSelect: () =>
    set({
      isTrackSelectOpen: false,
    }),

  startRaceFromHub: (targetTrackId?: string) =>
    set((state) => {
      const trackId = targetTrackId || state.activeTrackId;
      const track = getTrack(trackId);
      return {
        mode: 'race',
        phase: 'idle',
        activeTrackId: track.id,
        bestTime: state.bestTimes[track.id] ?? null,
        raceStartTime: null,
        finishTime: null,
        nextCheckpoint: 0,
        runId: state.runId + 1,
        playerRank: 1,
        isDialogueOpen: false,
        isTrackSelectOpen: false,
        dialogueIndex: 0,
        selectedChoiceIndex: 0,
      };
    }),

  returnToHub: () =>
    set((state) => ({
      mode: 'hub',
      phase: 'idle',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: state.runId + 1,
      isDialogueOpen: false,
      isTrackSelectOpen: false,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    })),

  openDialogue: () => {
    // Record that player has met mentor
    const updated = updateDialogueFlags({ met_mentor: true });
    set({
      isDialogueOpen: true,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
      flags: updated.flags,
    });
  },

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
    const track = getTrack(state.activeTrackId);

    // Save record to persistent storage and check progression unlock
    const { data } = saveTrackRecord(state.activeTrackId, time, rank);

    set({
      phase: 'finished',
      finishTime: time,
      bestTime: data.bestTimes[state.activeTrackId] ?? time,
      playerRank: rank,
      nextCheckpoint: track.checkpoints.length,
      unlockedTracks: data.unlockedTracks,
      bestTimes: data.bestTimes,
      flags: data.flags,
    });
  },

  restart: () => {
    const state = get();
    if (state.mode === 'hub') {
      // In hub, R returns the otter to the hub spawn point
      set((s) => ({
        runId: s.runId + 1,
        isDialogueOpen: false,
        isTrackSelectOpen: false,
      }));
      return;
    }

    // In race, R restarts countdown
    const currentBest = state.bestTimes[state.activeTrackId] ?? null;
    set((s) => ({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: s.runId + 1,
      playerRank: 1,
      bestTime: currentBest,
    }));
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __useGameStore: typeof useGameStore }).__useGameStore = useGameStore;
}
