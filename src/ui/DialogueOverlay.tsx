'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '../game/useGameStore';
import { getActiveDialogue, DialogueChoice } from '../game/dialogue/hub';

/**
 * DialogueOverlay Component (Milestone 10 & 11)
 * Data-driven dialogue UI and interaction prompt for mentor NPC Elder Moss.
 * Displays progress-dependent dialogue branches and opens Track Select upon choosing 'Race now!'.
 * Rendered outside Canvas so dialogue advances never re-render the 3D scene.
 */
export function DialogueOverlay() {
  const mode = useGameStore((state) => state.mode);
  const isDialogueOpen = useGameStore((state) => state.isDialogueOpen);
  const dialogueIndex = useGameStore((state) => state.dialogueIndex);
  const selectedChoiceIndex = useGameStore((state) => state.selectedChoiceIndex);
  const isNearNpc = useGameStore((state) => state.isNearNpc);
  const flags = useGameStore((state) => state.flags);
  const unlockedTracks = useGameStore((state) => state.unlockedTracks);

  const openDialogue = useGameStore((state) => state.openDialogue);
  const advanceDialogue = useGameStore((state) => state.advanceDialogue);
  const selectChoice = useGameStore((state) => state.selectChoice);
  const closeDialogue = useGameStore((state) => state.closeDialogue);
  const openTrackSelect = useGameStore((state) => state.openTrackSelect);

  // Data-driven dialogue sequence based on current progress & flags (Requirement 6)
  const currentSequence = useMemo(
    () => getActiveDialogue(flags, unlockedTracks),
    [flags, unlockedTracks]
  );

  const currentLine = currentSequence[dialogueIndex];
  const hasChoices = currentLine && currentLine.choices && currentLine.choices.length > 0;

  const handleChoiceSelect = useCallback(
    (action: DialogueChoice['action']) => {
      if (action === 'track_select') {
        openTrackSelect();
      } else {
        closeDialogue();
      }
    },
    [openTrackSelect, closeDialogue]
  );

  // Keyboard navigation for dialogue and interaction prompt
  useEffect(() => {
    if (mode !== 'hub') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Open dialogue when near NPC and pressing E
      if (!isDialogueOpen) {
        if (isNearNpc && (e.code === 'KeyE' || e.key.toLowerCase() === 'e')) {
          e.preventDefault();
          openDialogue();
        }
        return;
      }

      // 2. When dialogue is open, handle line progression and choice selection
      e.stopPropagation();

      if (hasChoices && currentLine?.choices) {
        if (e.code === 'Digit1' || e.key === '1') {
          e.preventDefault();
          handleChoiceSelect(currentLine.choices[0].action);
        } else if (e.code === 'Digit2' || e.key === '2') {
          e.preventDefault();
          handleChoiceSelect(currentLine.choices[1].action);
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
          e.preventDefault();
          selectChoice(0);
        } else if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
          e.preventDefault();
          selectChoice(1);
        } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE' || e.key.toLowerCase() === 'e') {
          e.preventDefault();
          const chosen = currentLine.choices[selectedChoiceIndex] || currentLine.choices[0];
          handleChoiceSelect(chosen.action);
        }
      } else {
        // Advance to next line with E, Enter or Space
        if (
          e.code === 'KeyE' ||
          e.key.toLowerCase() === 'e' ||
          e.code === 'Enter' ||
          e.code === 'Space'
        ) {
          e.preventDefault();
          if (dialogueIndex < currentSequence.length - 1) {
            advanceDialogue();
          } else {
            closeDialogue();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    mode,
    isDialogueOpen,
    isNearNpc,
    hasChoices,
    currentLine,
    currentSequence,
    dialogueIndex,
    selectedChoiceIndex,
    openDialogue,
    advanceDialogue,
    selectChoice,
    closeDialogue,
    handleChoiceSelect,
  ]);

  if (mode !== 'hub') return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-6 select-none font-sans">
      {/* Interact Prompt when near NPC and dialogue not yet opened */}
      {!isDialogueOpen && isNearNpc && (
        <div className="pointer-events-auto mx-auto mb-8 animate-bounce">
          <button
            onClick={() => openDialogue()}
            className="flex items-center gap-3 bg-slate-950/85 border-2 border-amber-400/80 px-6 py-3 rounded-full text-white shadow-2xl backdrop-blur-md hover:bg-slate-900/90 transition-all cursor-pointer"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-sm">
              E
            </span>
            <span className="font-semibold text-amber-200 tracking-wide text-base">
              Talk with Elder Moss
            </span>
          </button>
        </div>
      )}

      {/* Active Dialogue Box */}
      {isDialogueOpen && currentLine && (
        <div className="pointer-events-auto mx-auto w-full max-w-2xl bg-slate-950/95 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-white space-y-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Speaker Badge */}
          <div className="flex items-center justify-between">
            <span className="inline-block bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold px-3.5 py-1 rounded-full text-xs tracking-wider uppercase">
              {currentLine.speaker}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {dialogueIndex + 1} / {currentSequence.length}
            </span>
          </div>

          {/* Dialogue Text */}
          <p className="text-slate-100 text-lg leading-relaxed font-medium min-h-[64px]">
            {currentLine.text}
          </p>

          {/* Choices or Next Hint */}
          {hasChoices && currentLine.choices ? (
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {currentLine.choices.map((choice, idx) => {
                const isSelected = selectedChoiceIndex === idx;
                const isRace = choice.action === 'track_select';
                return (
                  <button
                    key={idx}
                    onClick={() => handleChoiceSelect(choice.action)}
                    onMouseEnter={() => selectChoice(idx)}
                    className={`flex-1 flex items-center justify-between px-5 py-3 rounded-2xl border-2 font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? isRace
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg shadow-emerald-500/25 scale-[1.02]'
                          : 'bg-slate-800 text-white border-sky-400 shadow-lg scale-[1.02]'
                        : isRace
                        ? 'bg-emerald-950/60 text-emerald-200 border-emerald-700/60 hover:bg-emerald-900/60'
                        : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{choice.text}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                        isSelected
                          ? isRace
                            ? 'bg-slate-950 text-emerald-400'
                            : 'bg-slate-950 text-sky-400'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      [{idx + 1}]
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  if (dialogueIndex < currentSequence.length - 1) {
                    advanceDialogue();
                  } else {
                    closeDialogue();
                  }
                }}
                className="text-xs text-emerald-400 flex items-center gap-2 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[11px] text-slate-200">
                  E / Space ↵
                </kbd>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DialogueOverlay;
