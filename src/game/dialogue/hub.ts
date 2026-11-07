import { SaveFlags } from '../saveSystem';

export interface DialogueChoice {
  text: string;
  action: 'track_select' | 'close';
}

export interface DialogueLine {
  id: number;
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
  /** Optional data-driven predicate condition */
  requires?: (flags: SaveFlags, unlockedTracks: string[]) => boolean;
  hiddenIf?: (flags: SaveFlags, unlockedTracks: string[]) => boolean;
}

export interface DialogueSequence {
  id: string;
  condition: (flags: SaveFlags, unlockedTracks: string[]) => boolean;
  lines: DialogueLine[];
}

export const hubDialogueSequences: DialogueSequence[] = [
  // 1. Serpentine Rapids Unlock Sequence
  {
    id: 'river02_unlocked',
    condition: (flags) => Boolean(flags.river02_unlocked),
    lines: [
      {
        id: 101,
        speaker: 'Elder Moss',
        text: 'Outstanding swimming, young one! I saw your top-three finish down on Calm Bend!',
      },
      {
        id: 102,
        speaker: 'Elder Moss',
        text: 'The roaring waters of Serpentine Rapids have opened downstream in the canyon.',
      },
      {
        id: 103,
        speaker: 'Elder Moss',
        text: 'The S-curve rapids are treacherous and fast—weave between the jagged rock hazards and ride the crossing currents!',
      },
      {
        id: 104,
        speaker: 'Elder Moss',
        text: 'Which waters shall you challenge today?',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Not yet, let me swim around first.', action: 'close' },
        ],
      },
    ],
  },

  // 2. Return After First Race (before top-3 unlock)
  {
    id: 'return_after_first_race',
    condition: (flags) => Boolean(flags.first_race_done && !flags.river02_unlocked),
    lines: [
      {
        id: 201,
        speaker: 'Elder Moss',
        text: 'Welcome back from the canyon! How did the water feel beneath your whiskers?',
      },
      {
        id: 202,
        speaker: 'Elder Moss',
        text: 'To unlock the wild Serpentine Rapids downstream, you must place in the top 3 on Calm Bend.',
      },
      {
        id: 203,
        speaker: 'Elder Moss',
        text: 'Ride the blue currents, time your dashes, and weave through the rock hazards to beat Pip, Luna, and Barnaby!',
      },
      {
        id: 204,
        speaker: 'Elder Moss',
        text: 'Are you ready to dive back in and race?',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Not yet, let me swim around first.', action: 'close' },
        ],
      },
    ],
  },

  // 3. First Meeting Sequence (Default)
  {
    id: 'first_meeting',
    condition: () => true,
    lines: [
      {
        id: 301,
        speaker: 'Elder Moss',
        text: 'Ah, greetings little swimmer! I am Elder Moss, keeper of these quiet pond headwaters.',
      },
      {
        id: 302,
        speaker: 'Elder Moss',
        text: 'I watched your drifting form out on the pond. You have natural instinct on the water.',
      },
      {
        id: 303,
        speaker: 'Elder Moss',
        text: 'The other three river racers—Pip, Luna, and Barnaby—are ready down at Calm Bend.',
      },
      {
        id: 304,
        speaker: 'Elder Moss',
        text: 'Mind the swirling rapids—riding the blue currents will boost your speed, but watch out for the jagged rock hazards.',
      },
      {
        id: 305,
        speaker: 'Elder Moss',
        text: 'Pass through every checkpoint arch in order, and cross the golden finish line at the river bend.',
      },
      {
        id: 306,
        speaker: 'Elder Moss',
        text: 'Are you ready to test your whiskers against the river current?',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Not yet, let me swim around first.', action: 'close' },
        ],
      },
    ],
  },
];

/**
 * Returns the active dialogue sequence matching current game flags and unlocked tracks
 */
export function getActiveDialogue(
  flags: SaveFlags,
  unlockedTracks: string[]
): DialogueLine[] {
  for (const seq of hubDialogueSequences) {
    if (seq.condition(flags, unlockedTracks)) {
      return seq.lines;
    }
  }
  return hubDialogueSequences[hubDialogueSequences.length - 1].lines;
}

// Default export for backwards compatibility
export const hubDialogue = hubDialogueSequences[hubDialogueSequences.length - 1].lines;
