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
import { UNLOCK_BANNERS } from './dialogue/storyData';
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

  // Dialogue state (Milestone 10 & 11 & 13)
  isDialogueOpen: boolean;
  dialogueIndex: number;
  selectedChoiceIndex: number;
  isNearNpc: boolean;
  activeDialogueSceneId: string | null;

  // Story & Rival State (Milestone 13)
  readyRivalIndex: number;
  secondPlaceRivalId: string | null;
  winningRivalId: string | null;
  unlockBanner: string | null;

  // Actions
  setMode: (mode: GameMode) => void;
  selectTrack: (trackId: string) => void;
  setRivalStandings: (secondPlaceId: string | null, winningId: string | null) => void;
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
  activeDialogueSceneId: null,

  // Story & Rival State (Milestone 13)
  readyRivalIndex: 0,
  secondPlaceRivalId: null,
  winningRivalId: null,
  unlockBanner: null,

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

  setRivalStandings: (secondPlaceId: string | null, winningId: string | null) => {
    set({
      secondPlaceRivalId: secondPlaceId,
      winningRivalId: winningId,
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
        readyRivalIndex: state.runId % 3,
        secondPlaceRivalId: null,
        winningRivalId: null,
        unlockBanner: null,
        playerRank: 1,
        isDialogueOpen: false,
        activeDialogueSceneId: null,
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
      readyRivalIndex: 0,
      secondPlaceRivalId: null,
      winningRivalId: null,
      unlockBanner: null,
      isDialogueOpen: false,
      activeDialogueSceneId: null,
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
      activeDialogueSceneId: null,
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
      activeDialogueSceneId: null,
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
    const { data, unlockedRiver02, unlockedRiver03, justCompletedRiver02Top3 } =
      saveTrackRecord(state.activeTrackId, time, rank);

    let unlockBanner: string | null = null;
    if (unlockedRiver02) {
      unlockBanner = UNLOCK_BANNERS.river02Unlocked;
    } else if (unlockedRiver03) {
      unlockBanner = UNLOCK_BANNERS.river03Unlocked;
    }

    const showWisp = justCompletedRiver02Top3;

    set({
      phase: 'finished',
      finishTime: time,
      bestTime: data.bestTimes[state.activeTrackId] ?? time,
      playerRank: rank,
      nextCheckpoint: track.checkpoints.length,
      unlockedTracks: data.unlockedTracks,
      bestTimes: data.bestTimes,
      flags: data.flags,
      unlockBanner,
      isDialogueOpen: showWisp,
      activeDialogueSceneId: showWisp ? 'wisp_whisper' : null,
      dialogueIndex: 0,
      selectedChoiceIndex: 0,
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
        activeDialogueSceneId: null,
        isTrackSelectOpen: false,
        isPaused: false,
        pausedAt: null,
        pauseOffset: 0,
        isSettingsOpen: false,
      }));
      return;
    }

    // In race, R restarts countdown while preserving readyRivalIndex
    const currentBest = state.bestTimes[state.activeTrackId] ?? null;
    set((s) => ({
      phase: 'countdown',
      raceStartTime: null,
      finishTime: null,
      nextCheckpoint: 0,
      runId: s.runId + 1,
      playerRank: 1,
      bestTime: currentBest,
      secondPlaceRivalId: null,
      winningRivalId: null,
      unlockBanner: null,
      isDialogueOpen: false,
      activeDialogueSceneId: null,
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
