import { create } from 'zustand';
import { getTrack } from './tracks/registry';
import {
  loadSaveData,
  saveTrackRecord,
  updateDialogueFlags,
  updateSaveSettings,
  SaveFlags,
  GameSettings,
} from './saveSystem';
import { soundManager } from './audio/soundManager';

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

  // Pause & Settings State (Milestone 12)
  isPaused: boolean;
  pausedAt: number | null;
  pauseOffset: number;
  isSettingsOpen: boolean;
  settings: GameSettings;

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

  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  updateSettings: (partial: Partial<GameSettings>) => void;
  toggleMute: () => void;

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

  // Pause & Settings
  isPaused: false,
  pausedAt: null,
  pauseOffset: 0,
  isSettingsOpen: false,
  settings: initialSave.settings,

  // Dialogue
  isDialogueOpen: false,
  dialogueIndex: 0,
  selectedChoiceIndex: 0,
  isNearNpc: false,

  setMode: (mode: GameMode) => set({ mode }),

  selectTrack: (trackId: string) => {
    soundManager.playUiClick();
    const state = get();
    const track = getTrack(trackId);
    set({
      activeTrackId: track.id,
      bestTime: state.bestTimes[track.id] ?? null,
      isTrackSelectOpen: false,
      nextCheckpoint: 0,
    });
  },

  openTrackSelect: () => {
    soundManager.playUiClick();
    set({
      isTrackSelectOpen: true,
      isDialogueOpen: false,
      isPaused: false,
    });
  },

  closeTrackSelect: () => {
    soundManager.playUiClick();
    set({
      isTrackSelectOpen: false,
    });
  },

  startRaceFromHub: (targetTrackId?: string) => {
    soundManager.playUiClick();
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
        isPaused: false,
        pausedAt: null,
        pauseOffset: 0,
        isSettingsOpen: false,
        dialogueIndex: 0,
        selectedChoiceIndex: 0,
      };
    });
  },

  returnToHub: () => {
    soundManager.playUiClick();
    set((state) => ({
      mode: 'hub',
      phase: 'idle',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: state.runId + 1,
      isDialogueOpen: false,
      isTrackSelectOpen: false,
      isPaused: false,
      pausedAt: null,
      pauseOffset: 0,
      isSettingsOpen: false,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    }));
  },

  openDialogue: () => {
    soundManager.playDialogueBlip();
    const updated = updateDialogueFlags({ met_mentor: true });
    set({
      isDialogueOpen: true,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
      flags: updated.flags,
      isPaused: false,
    });
  },

  advanceDialogue: () => {
    soundManager.playDialogueBlip();
    set((state) => ({
      dialogueIndex: state.dialogueIndex + 1,
      selectedChoiceIndex: 0,
    }));
  },

  selectChoice: (index: number) => {
    soundManager.playUiClick();
    set({
      selectedChoiceIndex: index,
    });
  },

  closeDialogue: () => {
    soundManager.playUiClick();
    set({
      isDialogueOpen: false,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
    });
  },

  setIsNearNpc: (near: boolean) =>
    set({
      isNearNpc: near,
    }),

  pause: () => {
    const state = get();
    // Cannot pause during dialogue or track select
    if (state.isPaused || state.isDialogueOpen || state.isTrackSelectOpen) return;
    soundManager.playUiClick();
    set({
      isPaused: true,
      pausedAt: performance.now(),
    });
  },

  resume: () => {
    const state = get();
    if (!state.isPaused) return;
    soundManager.playUiClick();
    const now = performance.now();
    const added = state.pausedAt ? now - state.pausedAt : 0;
    set({
      isPaused: false,
      pausedAt: null,
      pauseOffset: state.pauseOffset + added,
      isSettingsOpen: false,
    });
  },

  togglePause: () => {
    const state = get();
    if (state.isPaused) {
      if (state.isSettingsOpen) {
        soundManager.playUiClick();
        set({ isSettingsOpen: false });
      } else {
        state.resume();
      }
    } else {
      state.pause();
    }
  },

  openSettings: () => {
    soundManager.playUiClick();
    set({ isSettingsOpen: true });
  },

  closeSettings: () => {
    soundManager.playUiClick();
    set({ isSettingsOpen: false });
  },

  updateSettings: (partial: Partial<GameSettings>) => {
    const updated = updateSaveSettings(partial);
    soundManager.setSettings(updated.settings);
    set({ settings: updated.settings });
  },

  toggleMute: () => {
    const state = get();
    const newMuted = !state.settings.muted;
    const updated = updateSaveSettings({ muted: newMuted });
    soundManager.setSettings(updated.settings);
    set({ settings: updated.settings });
  },

  startCountdown: () => {
    soundManager.init();
    set((state) => ({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: state.runId + 1,
      playerRank: 1,
      isPaused: false,
      pausedAt: null,
      pauseOffset: 0,
      isSettingsOpen: false,
    }));
  },

  startRace: () => {
    set({
      phase: 'racing',
      raceStartTime: performance.now(),
      isPaused: false,
      pausedAt: null,
      pauseOffset: 0,
    });
  },

  hitCheckpoint: (index: number) => {
    soundManager.playCheckpointChime();
    set({
      nextCheckpoint: index + 1,
    });
  },

  finish: (time: number, rank = 1) => {
    soundManager.playFinishFanfare(rank);
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
      isPaused: false,
      pausedAt: null,
    });
  },

  restart: () => {
    soundManager.playUiClick();
    const state = get();
    if (state.mode === 'hub') {
      // In hub, R returns the otter to the hub spawn point
      set((s) => ({
        runId: s.runId + 1,
        isDialogueOpen: false,
        isTrackSelectOpen: false,
        isPaused: false,
        pausedAt: null,
        pauseOffset: 0,
        isSettingsOpen: false,
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
      isPaused: false,
      pausedAt: null,
      pauseOffset: 0,
      isSettingsOpen: false,
    }));
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __useGameStore: typeof useGameStore }).__useGameStore = useGameStore;
}
