export interface DialogueChoice {
  text: string;
  action: 'race' | 'close';
}

export interface DialogueLine {
  id: number;
  speaker: string;
  text: string;
  choices?: DialogueChoice[];
}

export const hubDialogue: DialogueLine[] = [
  {
    id: 1,
    speaker: 'Barnaby (River Guide)',
    text: 'Ah, greetings little swimmer! The morning currents are running swift and clear down in the canyon.',
  },
  {
    id: 2,
    speaker: 'Barnaby (River Guide)',
    text: 'I watched your drifting form out on the pond. You have natural instinct on the water.',
  },
  {
    id: 3,
    speaker: 'Barnaby (River Guide)',
    text: 'The other three river racers—Pip, Luna, and myself—are ready at the headwaters of Calm Bend.',
  },
  {
    id: 4,
    speaker: 'Barnaby (River Guide)',
    text: 'Mind the swirling rapids—riding the blue currents will boost your speed, but watch out for the jagged rock hazards.',
  },
  {
    id: 5,
    speaker: 'Barnaby (River Guide)',
    text: 'Pass through every checkpoint arch in order, and cross the golden finish line at the river bend.',
  },
  {
    id: 6,
    speaker: 'Barnaby (River Guide)',
    text: 'Are you ready to test your whiskers against the river current?',
    choices: [
      { text: 'Race now!', action: 'race' },
      { text: 'Not yet, let me swim around first.', action: 'close' },
    ],
  },
];

