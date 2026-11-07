import { DialogueSequence } from './hub';

export interface RivalReadyLine {
  speaker: string;
  rivalId: string;
  color: string;
  text: string;
}

export interface ResultDialogue {
  speaker: string;
  speakerColor: string;
  text: string;
}

/**
 * Section 7: Rival lines before a race (Ready Screen)
 * Tracked deterministically per run session.
 */
export const RIVAL_READY_LINES: Record<string, RivalReadyLine[]> = {
  'river-01': [
    {
      speaker: 'Pip',
      rivalId: 'rival_pip',
      color: '#38bdf8', // Sapphire blue
      text: "Hi! I’m Pip! I’ve never lost on this river. Okay, I’ve lost a little. Okay, a lot!",
    },
    {
      speaker: 'Barnaby',
      rivalId: 'rival_barnaby',
      color: '#34d399', // Emerald green
      text: "Slow water goes far, friend. No need to rush the Bend.",
    },
    {
      speaker: 'Luna',
      rivalId: 'rival_luna',
      color: '#fb7185', // Rose red
      text: "Try to keep up. I’ll wave when I lap you.",
    },
  ],
  'river-02': [
    {
      speaker: 'Pip',
      rivalId: 'rival_pip',
      color: '#38bdf8',
      text: "The Rapids bite! Dodge the black stones or they’ll slow you to a crawl!",
    },
    {
      speaker: 'Barnaby',
      rivalId: 'rival_barnaby',
      color: '#34d399',
      text: "Those stones weren’t here last season. The water has gone strange.",
    },
    {
      speaker: 'Luna',
      rivalId: 'rival_luna',
      color: '#fb7185',
      text: "Ride the stream, weave the stones, don’t blink. Race you.",
    },
  ],
};

/**
 * Section 8: Results lines displayed on the results panel
 */
export const RESULT_LINES = {
  player1st_pip2nd: {
    speaker: 'Pip',
    speakerColor: '#38bdf8',
    text: "You WON! I wanted to win, but this is almost as good!",
  },
  player1st_barnaby2nd: {
    speaker: 'Barnaby',
    speakerColor: '#34d399',
    text: "Well swum. Fast water goes first, I suppose.",
  },
  player1st_luna2nd: {
    speaker: 'Luna',
    speakerColor: '#fb7185',
    text: "Hmph. You rode that stream like you were born in it. Rematch?",
  },
  playerTop3_pipWon: {
    speaker: 'Pip',
    speakerColor: '#38bdf8',
    text: "I won?! I actually won! Did you see that?!",
  },
  playerTop3_barnabyWon: {
    speaker: 'Barnaby',
    speakerColor: '#34d399',
    text: "Steady strokes, friend. Good race. Next time the stream is yours.",
  },
  playerTop3_lunaWon: {
    speaker: 'Luna',
    speakerColor: '#fb7185',
    text: "Told you. Keep practicing, I like a challenge.",
  },
  player4th: {
    speaker: 'Elder Moss (called from the dock)',
    speakerColor: '#10b981',
    text: "Chin up, little swimmer! Last place is first place waiting for another try.",
  },
} as const;

/**
 * Section 8: Progression unlock banners
 */
export const UNLOCK_BANNERS = {
  river02Unlocked: 'New river unlocked: Serpentine Rapids',
  river03Unlocked: 'New river unlocked: The Wellspring Run',
  wellspringStirred: 'The Wellspring glows faintly. Swim once more.',
} as const;

/**
 * Section 9: Wisp whisper sequence (Part 1)
 * Triggered once when Serpentine Rapids is first finished in the top 3.
 */
export const WISP_WHISPER_SEQUENCE: DialogueSequence = {
  id: 'wisp_whisper',
  condition: () => false,
  lines: [
    {
      id: 901,
      speaker: 'Wisp',
      text: '…upstream… please…',
    },
    {
      id: 902,
      speaker: 'Wisp',
      text: '…the stream is so quiet…',
    },
  ],
};

/**
 * Resolves deterministic rival line for ready screen
 */
export function getRivalReadyLine(trackId: string, runIndex: number): RivalReadyLine | null {
  const lines = RIVAL_READY_LINES[trackId];
  if (!lines || lines.length === 0) return null;
  const index = Math.abs(runIndex) % lines.length;
  return lines[index];
}

/**
 * Resolves results dialogue based on rank and rival placement
 */
export function getResultDialogue(
  playerRank: number,
  secondPlaceRivalId?: string | null,
  winningRivalId?: string | null
): ResultDialogue {
  if (playerRank === 1) {
    if (secondPlaceRivalId === 'rival_pip') return RESULT_LINES.player1st_pip2nd;
    if (secondPlaceRivalId === 'rival_barnaby') return RESULT_LINES.player1st_barnaby2nd;
    return RESULT_LINES.player1st_luna2nd;
  }
  if (playerRank === 2 || playerRank === 3) {
    if (winningRivalId === 'rival_pip') return RESULT_LINES.playerTop3_pipWon;
    if (winningRivalId === 'rival_barnaby') return RESULT_LINES.playerTop3_barnabyWon;
    return RESULT_LINES.playerTop3_lunaWon;
  }
  return RESULT_LINES.player4th;
}
