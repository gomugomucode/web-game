import { GAME_CONSTANTS } from './constants';

export const SAVE_STORAGE_KEY = 'otter-run:save';

export interface SaveFlags {
  met_mentor: boolean;
  first_race_done: boolean;
  river02_unlocked: boolean;
  river02_done: boolean;
  river03_unlocked: boolean;
  story_complete?: boolean;
}

export interface GameSettings {
  masterVolume: number; // 0.0 to 1.0
  musicVolume: number;  // 0.0 to 1.0
  sfxVolume: number;    // 0.0 to 1.0
  muted: boolean;
  graphicsQuality: 'high' | 'low';
}

export interface SaveData {
  version: 2;
  unlockedTracks: string[];
  bestTimes: Record<string, number>;
  flags: SaveFlags;
  settings: GameSettings;
}

export const DEFAULT_SETTINGS: Readonly<GameSettings> = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  muted: false,
  graphicsQuality: 'high',
};

export const DEFAULT_SAVE_DATA: Readonly<SaveData> = {
  version: 2,
  unlockedTracks: ['river-01'],
  bestTimes: {},
  flags: {
    met_mentor: false,
    first_race_done: false,
    river02_unlocked: false,
    river02_done: false,
    river03_unlocked: false,
  },
  settings: { ...DEFAULT_SETTINGS },
};

function getLegacyKey(trackId: string): string {
  return `${GAME_CONSTANTS.BEST_TIME_STORAGE_PREFIX}${trackId}`;
}

export function loadSaveData(): SaveData {
  if (typeof window === 'undefined') {
    return JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
  }

  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const unlocked = Array.isArray(parsed.unlockedTracks) && parsed.unlockedTracks.length > 0
          ? [...parsed.unlockedTracks]
          : ['river-01'];
        if (!unlocked.includes('river-01')) {
          unlocked.unshift('river-01');
        }

        const bestTimes: Record<string, number> =
          parsed.bestTimes && typeof parsed.bestTimes === 'object'
            ? { ...parsed.bestTimes }
            : {};

        const flags: SaveFlags = {
          met_mentor: Boolean(parsed.flags?.met_mentor),
          first_race_done: Boolean(parsed.flags?.first_race_done),
          river02_unlocked: Boolean(parsed.flags?.river02_unlocked || unlocked.includes('river-02')),
          river02_done: Boolean(parsed.flags?.river02_done),
          river03_unlocked: Boolean(parsed.flags?.river03_unlocked),
        };

        if (flags.river02_unlocked && !unlocked.includes('river-02')) {
          unlocked.push('river-02');
        }

        // Migrate settings from version 1 or validate version 2 settings
        const loadedSettings: GameSettings = {
          masterVolume: typeof parsed.settings?.masterVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.settings.masterVolume))
            : DEFAULT_SETTINGS.masterVolume,
          musicVolume: typeof parsed.settings?.musicVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.settings.musicVolume))
            : DEFAULT_SETTINGS.musicVolume,
          sfxVolume: typeof parsed.settings?.sfxVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.settings.sfxVolume))
            : DEFAULT_SETTINGS.sfxVolume,
          muted: Boolean(parsed.settings?.muted ?? DEFAULT_SETTINGS.muted),
          graphicsQuality: parsed.settings?.graphicsQuality === 'low' ? 'low' : 'high',
        };

        const migratedSave: SaveData = {
          version: 2,
          unlockedTracks: unlocked,
          bestTimes,
          flags,
          settings: loadedSettings,
        };

        // If migrating from v1 (or if json wasn't already version 2), save v2 back
        if (parsed.version !== 2) {
          try {
            localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(migratedSave));
          } catch {
            // Ignore quota errors
          }
        }

        return migratedSave;
      }
    }

    // No valid save found: check legacy key for backward compatibility
    const legacyRiver01 = localStorage.getItem(getLegacyKey('river-01'));
    const initialBestTimes: Record<string, number> = {};
    if (legacyRiver01) {
      const parsedTime = parseFloat(legacyRiver01);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        initialBestTimes['river-01'] = parsedTime;
      }
    }

    const initialSave: SaveData = {
      version: 2,
      unlockedTracks: ['river-01'],
      bestTimes: initialBestTimes,
      flags: {
        met_mentor: false,
        first_race_done: false,
        river02_unlocked: false,
        river02_done: false,
        river03_unlocked: false,
      },
      settings: { ...DEFAULT_SETTINGS },
    };

    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(initialSave));
    } catch {
      // Ignore quota errors
    }

    return initialSave;
  } catch (err) {
    console.warn('Failed to parse otter-run:save from localStorage, falling back to defaults:', err);
    return JSON.parse(JSON.stringify(DEFAULT_SAVE_DATA));
  }
}

export function writeSaveData(data: SaveData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));

    // Dual-write best times to legacy keys
    for (const [trackId, time] of Object.entries(data.bestTimes)) {
      if (typeof time === 'number' && !isNaN(time) && time > 0) {
        localStorage.setItem(getLegacyKey(trackId), time.toString());
      }
    }
  } catch (err) {
    console.warn('Failed to write otter-run:save to localStorage:', err);
  }
}

export function saveTrackRecord(
  trackId: string,
  time: number,
  rank: number
): {
  data: SaveData;
  unlockedRiver02: boolean;
  unlockedRiver03: boolean;
  justCompletedRiver02Top3: boolean;
} {
  const current = loadSaveData();
  let unlockedRiver02 = false;
  let unlockedRiver03 = false;
  let justCompletedRiver02Top3 = false;

  const prevBest = current.bestTimes[trackId];
  if (prevBest === undefined || time < prevBest) {
    current.bestTimes[trackId] = time;
  }

  current.flags.first_race_done = true;

  if (trackId === 'river-01' && rank <= 3) {
    if (!current.unlockedTracks.includes('river-02')) {
      current.unlockedTracks.push('river-02');
      current.flags.river02_unlocked = true;
      unlockedRiver02 = true;
    }
  }

  if (trackId === 'river-02' && rank <= 3) {
    if (!current.flags.river02_done) {
      current.flags.river02_done = true;
      current.flags.river03_unlocked = true;
      unlockedRiver03 = true;
      justCompletedRiver02Top3 = true;
    }
  }

  writeSaveData(current);
  return {
    data: current,
    unlockedRiver02,
    unlockedRiver03,
    justCompletedRiver02Top3,
  };
}

export function updateDialogueFlags(partialFlags: Partial<SaveFlags>): SaveData {
  const current = loadSaveData();
  current.flags = {
    ...current.flags,
    ...partialFlags,
  };
  writeSaveData(current);
  return current;
}

export function updateSaveSettings(partialSettings: Partial<GameSettings>): SaveData {
  const current = loadSaveData();
  current.settings = {
    ...current.settings,
    ...partialSettings,
  };
  writeSaveData(current);
  return current;
}
