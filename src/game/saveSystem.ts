import { GAME_CONSTANTS } from './constants';

export const SAVE_STORAGE_KEY = 'otter-run:save';

export interface SaveFlags {
  met_mentor: boolean;
  first_race_done: boolean;
  river02_unlocked: boolean;
}

export interface SaveData {
  version: 1;
  unlockedTracks: string[];
  bestTimes: Record<string, number>;
  flags: SaveFlags;
}

export const DEFAULT_SAVE_DATA: Readonly<SaveData> = {
  version: 1,
  unlockedTracks: ['river-01'],
  bestTimes: {},
  flags: {
    met_mentor: false,
    first_race_done: false,
    river02_unlocked: false,
  },
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
      if (parsed && parsed.version === 1) {
        // Validate and ensure all required fields exist
        const unlocked = Array.isArray(parsed.unlockedTracks) && parsed.unlockedTracks.length > 0
          ? parsed.unlockedTracks
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
        };

        // If river02_unlocked is true, ensure 'river-02' is in unlockedTracks
        if (flags.river02_unlocked && !unlocked.includes('river-02')) {
          unlocked.push('river-02');
        }

        return {
          version: 1,
          unlockedTracks: unlocked,
          bestTimes,
          flags,
        };
      }
    }

    // No valid modern save file found: check legacy key for backward compatibility
    const legacyRiver01 = localStorage.getItem(getLegacyKey('river-01'));
    const initialBestTimes: Record<string, number> = {};
    if (legacyRiver01) {
      const parsedTime = parseFloat(legacyRiver01);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        initialBestTimes['river-01'] = parsedTime;
      }
    }

    const initialSave: SaveData = {
      version: 1,
      unlockedTracks: ['river-01'],
      bestTimes: initialBestTimes,
      flags: {
        met_mentor: false,
        first_race_done: false,
        river02_unlocked: false,
      },
    };

    // Attempt to persist the migrated save
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(initialSave));
    } catch {
      // Ignore quota errors during initial write
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
): { data: SaveData; unlockedRiver02: boolean } {
  const current = loadSaveData();
  let unlockedRiver02 = false;

  const prevBest = current.bestTimes[trackId];
  if (prevBest === undefined || time < prevBest) {
    current.bestTimes[trackId] = time;
  }

  current.flags.first_race_done = true;

  // Milestone 11 Progression Rule: river02 is unlocked when river01 is finished in top 3
  if (trackId === 'river-01' && rank <= 3) {
    if (!current.unlockedTracks.includes('river-02')) {
      current.unlockedTracks.push('river-02');
      current.flags.river02_unlocked = true;
      unlockedRiver02 = true;
    }
  }

  writeSaveData(current);
  return { data: current, unlockedRiver02 };
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
