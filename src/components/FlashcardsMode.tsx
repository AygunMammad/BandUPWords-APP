import React, { useState } from 'react';
import { VocabSection } from '../types';

interface FlashcardsModeProps {
  section: VocabSection;
  onBack: () => void;
  onMarkWord: (wordId: string, known: boolean) => void;
}

export const FlashcardsMode: React.FC<FlashcardsModeProps> = ({
  section,
  onBack,
  onMarkWord,
}) => {
  const cards = section.words;
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [completed, setCompleted] = useState(false);

  const current = cards[idx];

  const speakWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!current) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(current.word);
      u.lang = 'en-GB';
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    }
  };

  const handleNext = (known: boolean) => {
    if (!current) return;
    onMarkWord(current.id, known);
    if (known) {
      setSessionKnown((k) => k + 1);
      setSessionXp((x) => x + 10);
    }
    setFlipped(false);
    if (idx + 1 >= cards.length) {
      setCompleted(true);
    } else {
      setIdx((i) => i + 1);
    }
  };

  const handleRestart = () => {
    setIdx(0);
    setFlipped(false);
    setSessionKnown(0);
    setSessionXp(0);
    setCompleted(false);
  };

  if (cards.length === 0) {
    return (
      <main className="flex-1 w-full max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-24 flex flex-col gap-6">
        <button type="button" onClick={onBack} className="self-start inline-flex items-center gap-2 text-light-primary font-label text-[14px] font-semibold">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Section
        </button>
        <div className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-8 text-center">
          No vocabulary words found in this section yet.
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Top Bar: Back + Counter + Progress Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Section"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_back
            </span>
          </button>
          <span className="font-title text-[16px] font-semibold text-light-on-surface">
            Flashcards
          </span>
          <span className="font-label text-[13px] font-semibold text-light-on-surface-variant tabular-nums">
            {completed ? cards.length : idx + 1} / {cards.length}
          </span>
        </div>
        <div className="w-full h-3 bg-light-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-hot-pink to-bright-blue rounded-full transition-all duration-300"
            style={{ width: `${completed ? 100 : ((idx + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {completed ? (
        <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-8 shadow-md flex flex-col items-center text-center gap-4">
          <span className="w-14 h-14 rounded-full bg-success-container text-success flex items-center justify-center">
            <span className="material-symbols-outlined material-symbols-filled text-[30px]" aria-hidden="true">
              check_circle
            </span>
          </span>
          <h1 className="font-display text-[28px] font-bold text-light-on-surface">
            Deck Complete!
          </h1>
          <p className="font-body text-[15px] text-light-on-surface-variant tabular-nums">
            You marked {sessionKnown} of {cards.length} words as known and earned +{sessionXp} XP.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="px-6 py-3 rounded-full border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface font-label text-[14px] font-semibold hover:bg-light-surface-container-low"
            >
              Practice Again
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm"
            >
              Choose Another Mode
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFlipped((f) => !f);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Flip flashcard"
            className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 md:p-8 shadow-md min-h-80 flex flex-col justify-between cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary"
          >
            {!flipped ? (
              <div className="flex flex-col items-center justify-center text-center gap-4 py-8 my-auto">
                <span className="px-4 py-1 rounded-full bg-light-secondary-container text-light-on-secondary-container font-label text-[12px] font-semibold">
                  Tap card to flip
                </span>
                <h1 className="font-display text-[28px] leading-[34px] md:text-[38px] md:leading-[46px] font-bold text-light-on-surface">
                  {current.word}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[14px] font-medium text-light-on-surface-variant">
                    {current.pronunciation}
                  </span>
                  <button
                    type="button"
                    onClick={speakWord}
                    aria-label="Listen to pronunciation"
                    className="w-10 h-10 rounded-full bg-light-primary-container text-light-primary inline-flex items-center justify-center hover:opacity-90"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      volume_up
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 border-b border-light-outline-variant pb-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="font-headline text-[22px] font-semibold text-light-on-surface">
                      {current.word}
                    </h2>
                    <span className="font-label text-[12px] font-semibold text-light-primary">
                      {current.type} · {current.ieltsLevel} · {current.topic}
                    </span>
                  </div>
                  <span className="font-label text-[12px] font-semibold text-light-on-surface-variant shrink-0">
                    Tap to flip back
                  </span>
                </div>

                <div className="rounded-[12px] bg-light-surface-container-low p-4 flex flex-col gap-1">
                  <span className="font-label text-[12px] font-semibold text-light-secondary">
                    Azerbaijani
                  </span>
                  <p className="font-title text-[18px] font-semibold text-light-on-surface">
                    {current.azerbaijani}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                    Definition
                  </span>
                  <p className="font-body text-[14px] text-light-on-surface">
                    {current.definition}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-[12px] bg-light-surface-container-lowest border border-light-outline-variant p-2.5 flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                      Collocation
                    </span>
                    <p className="font-label text-[13px] font-semibold text-light-secondary">
                      {current.collocation}
                    </p>
                  </div>
                  <div className="rounded-[12px] bg-light-surface-container-lowest border border-light-outline-variant p-2.5 flex flex-col gap-1">
                    <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                      Synonyms
                    </span>
                    <p className="font-label text-[13px] font-semibold text-light-on-surface">
                      {current.synonyms}
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] bg-light-surface-container-low p-4 flex flex-col gap-1">
                  <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
                    Example
                  </span>
                  <p className="font-body text-[14px] text-light-on-surface italic">
                    &ldquo;{current.example}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleNext(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-full bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low active:scale-[0.98] transition-transform duration-150"
            >
              <span className="material-symbols-outlined text-[18px] text-hot-pink" aria-hidden="true">
                refresh
              </span>
              <span className="font-label text-[15px] font-semibold whitespace-nowrap">Review again</span>
            </button>

            <button
              type="button"
              onClick={() => handleNext(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary shadow-md hover:opacity-95 active:scale-[0.98] transition-transform duration-150"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                check
              </span>
              <span className="font-label text-[15px] font-semibold whitespace-nowrap">I know it</span>
            </button>
          </div>
        </section>
      )}
    </main>
  );
};
