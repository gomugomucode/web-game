import { SaveFlags } from '../saveSystem';
import { WISP_WHISPER_SEQUENCE, WISP_AWAKENING_SEQUENCE } from './storyData';

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

/**
 * Hub Dialogue Sequences - Elder Moss (Section 6)
 * Selection checked from the top. The first match wins:
 * 1. story_complete is true: Scene F (Epilogue, Part 2)
 * 2. river03_unlocked is true: Scene E (Part 2)
 * 3. river02_unlocked is true: Scene D
 * 4. first_race_done is true: Scene C
 * 5. met_mentor is true: Scene B
 * 6. Otherwise: Scene A
 */
export const hubDialogueSequences: DialogueSequence[] = [
  // 1. Scene F: epilogue (Part 2) - story_complete is true
  {
    id: 'scene_f',
    condition: (flags) => Boolean(flags.story_complete),
    lines: [
      {
        id: 601,
        speaker: 'Elder Moss',
        text: 'The water sings again. Do you hear it? That’s you, little swimmer, and everyone you raced beside.',
      },
      {
        id: 602,
        speaker: 'Elder Moss',
        text: 'The Run is yours now. Race for the record, race for the fun of it, or just float. The Heartstreams will remember.',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Just floating.', action: 'close' },
        ],
      },
    ],
  },

  // 2. Scene E: river03 unlocked (Part 2)
  {
    id: 'scene_e',
    condition: (flags) => Boolean(flags.river03_unlocked),
    lines: [
      {
        id: 501,
        speaker: 'Elder Moss',
        text: 'You did it. I felt the Heartstreams brighten from here, I swear.',
      },
      {
        id: 502,
        speaker: 'Elder Moss',
        text: 'But the Dimstones didn’t vanish, did they? They are thickest upstream, toward the Wellspring, where the Run begins.',
      },
      {
        id: 503,
        speaker: 'Elder Moss',
        text: 'The Wellspring has a keeper, an old spirit we call the Wisp. With stones this thick, she must be sleeping very deeply.',
      },
      {
        id: 504,
        speaker: 'Elder Moss',
        text: 'The Wellspring Run is the oldest race in the valley, and the hardest. Everyone from the Haven will swim it with you.',
      },
      {
        id: 505,
        speaker: 'Elder Moss',
        text: 'No pressure, little swimmer. Only a whole valley’s worth of river.',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Not yet.', action: 'close' },
        ],
      },
    ],
  },

  // 2. Scene D: river02 unlocked
  {
    id: 'scene_d',
    condition: (flags) => Boolean(flags.river02_unlocked),
    lines: [
      {
        id: 401,
        speaker: 'Elder Moss',
        text: 'A top three finish on Calm Bend! I saw it from the dock, and my old heart did a little flip.',
      },
      {
        id: 402,
        speaker: 'Elder Moss',
        text: 'Downstream, the canyon opens into Serpentine Rapids. The water is fast there, and the Heartstreams are strong, when they feel like it.',
      },
      {
        id: 403,
        speaker: 'Elder Moss',
        text: 'I’ll be honest with you. The dark stones are spreading. The old folk call them Dimstones. They gather where a Heartstream goes quiet.',
      },
      {
        id: 404,
        speaker: 'Elder Moss',
        text: 'Every ride wakes a stream a little. Keep racing, and the river keeps its song.',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Not yet.', action: 'close' },
        ],
      },
    ],
  },

  // 3. Scene C: Finished Calm Bend, river02 still locked
  {
    id: 'scene_c',
    condition: (flags) => Boolean(flags.first_race_done),
    lines: [
      {
        id: 301,
        speaker: 'Elder Moss',
        text: 'You finished Calm Bend! Every finish counts, little swimmer, even the slow ones.',
      },
      {
        id: 302,
        speaker: 'Elder Moss',
        text: 'To open the next stretch of the Run, finish in the top three. Ride the pale Heartstreams, and steer around the dark stones.',
      },
      {
        id: 303,
        speaker: 'Elder Moss',
        text: 'Those dark stones… I don’t remember them being there when I was young. Odd.',
        choices: [
          { text: 'Race again!', action: 'track_select' },
          { text: 'Not yet.', action: 'close' },
        ],
      },
    ],
  },

  // 4. Scene B: Back without racing
  {
    id: 'scene_b',
    condition: (flags) => Boolean(flags.met_mentor),
    lines: [
      {
        id: 201,
        speaker: 'Elder Moss',
        text: 'Back already? The pond is lovely, but the Run is better. Calm Bend is waiting whenever you are.',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Just looking around.', action: 'close' },
        ],
      },
    ],
  },

  // 5. Scene A: First meeting (Default)
  {
    id: 'scene_a',
    condition: () => true,
    lines: [
      {
        id: 101,
        speaker: 'Elder Moss',
        text: 'Ah, a new face on the dock! Come closer, little swimmer. These old whiskers don’t see as far as they used to.',
      },
      {
        id: 102,
        speaker: 'Elder Moss',
        text: 'Welcome to Otter Haven. Our pond is calm, but out past the shore runs the Run, the river that feeds every pond in the valley.',
      },
      {
        id: 103,
        speaker: 'Elder Moss',
        text: 'Look at the water out there. See the pale ribbons? We call them Heartstreams. Ride one, and the river carries you like a friend.',
      },
      {
        id: 104,
        speaker: 'Elder Moss',
        text: 'Racing began as a way to keep the Heartstreams flowing. A stream no one rides forgets how to run.',
      },
      {
        id: 105,
        speaker: 'Elder Moss',
        text: 'Fewer swimmers race these days. I would like to change that, starting with you.',
      },
      {
        id: 106,
        speaker: 'Elder Moss',
        text: 'Calm Bend is the gentlest stretch of the Run. Three rivals wait at the line: Pip, Barnaby and Luna. Fair warning, Luna is quick.',
      },
      {
        id: 107,
        speaker: 'Elder Moss',
        text: 'Whenever you’re ready, the water is yours.',
        choices: [
          { text: 'Race now!', action: 'track_select' },
          { text: 'Not yet, let me swim around first.', action: 'close' },
        ],
      },
    ],
  },
];

/**
 * Returns the active dialogue sequence matching current game flags, unlocked tracks,
 * or an optional explicit scene override (e.g. wisp_whisper).
 */
export function getActiveDialogue(
  flags: SaveFlags,
  unlockedTracks: string[],
  overrideSceneId?: string | null
): DialogueLine[] {
  if (overrideSceneId) {
    if (overrideSceneId === 'wisp_whisper') {
      return WISP_WHISPER_SEQUENCE.lines;
    }
    if (overrideSceneId === 'wisp_awakening') {
      return WISP_AWAKENING_SEQUENCE.lines;
    }
    const found = hubDialogueSequences.find((s) => s.id === overrideSceneId);
    if (found) return found.lines;
  }

  for (const seq of hubDialogueSequences) {
    if (seq.condition(flags, unlockedTracks)) {
      return seq.lines;
    }
  }
  return hubDialogueSequences[hubDialogueSequences.length - 1].lines;
}

// Default export for backwards compatibility
export const hubDialogue = hubDialogueSequences[hubDialogueSequences.length - 1].lines;
