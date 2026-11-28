import React from 'react';
import { ScreenId, VocabSection } from '../types';

interface SectionModesViewProps {
  section: VocabSection;
  onBack: () => void;
  onSelectMode: (mode: ScreenId) => void;
}

export const SectionModesView: React.FC<SectionModesViewProps> = ({
  section,
  onBack,
  onSelectMode,
}) => {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Contextual Section Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Home"
          className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            arrow_back
          </span>
        </button>
        <div className="flex flex-col gap-0.5 min-w-0">
          <h1 className="font-headline text-[24px] leading-[30px] md:text-[30px] md:leading-[36px] font-bold text-light-on-surface break-words">
            {section.name}
          </h1>
          <p className="font-body text-[14px] text-light-on-surface-variant tabular-nums">
            {section.words.length} words · Choose a learning mode
          </p>
        </div>
      </div>

      {/* 7 Large Colorful Mode Cards */}
      <section aria-label="Learning modes" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {/* 1. Flashcards */}
        <button
          type="button"
          onClick={() => onSelectMode('flashcards')}
          className="text-left rounded-[16px] bg-gradient-to-br from-light-primary to-light-secondary p-6 text-light-on-primary shadow-md hover:opacity-95 transition-opacity duration-150 flex flex-col justify-between gap-4 h-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-light-surface-container-lowest text-light-primary flex items-center justify-center">
              <span className="material-symbols-outlined material-symbols-filled text-[22px]" aria-hidden="true">
                style
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[12px] font-semibold whitespace-nowrap">
              +10 XP / card
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold">Flashcards</h2>
            <p className="font-body text-[14px] opacity-95">
              Flip cards with pronunciation, Azerbaijani translation &amp; examples.
            </p>
          </div>
        </button>

        {/* 2. Gap-fill & Translation */}
        <button
          type="button"
          onClick={() => onSelectMode('gap-fill')}
          className="text-left rounded-[16px] bg-pastel-sky border border-light-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between gap-4 h-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-light-surface-container-lowest text-light-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                translate
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[12px] font-semibold whitespace-nowrap">
              +15 XP
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
              Gap-fill &amp; Translation
            </h2>
            <p className="font-body text-[14px] text-light-on-surface">
              Complete sentences and translate AZ ↔ EN with instant feedback.
            </p>
          </div>
        </button>

        {/* 3. Quiz */}
        <button
          type="button"
          onClick={() => onSelectMode('quiz')}
          className="text-left rounded-[16px] bg-pastel-rose border border-light-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between gap-4 h-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-light-surface-container-lowest text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                quiz
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[12px] font-semibold whitespace-nowrap">
              +15 XP
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">Quiz</h2>
            <p className="font-body text-[14px] text-light-on-surface">
              Test meanings, synonyms, and collocations with quick choices.
            </p>
          </div>
        </button>

        {/* 4. Writing */}
        <button
          type="button"
          onClick={() => onSelectMode('writing')}
          className="text-left rounded-[16px] bg-pastel-peach border border-light-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between gap-4 h-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-light-surface-container-lowest text-on-sunny-yellow-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                edit_note
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[12px] font-semibold whitespace-nowrap">
              Bonus XP
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">Writing</h2>
            <p className="font-body text-[14px] text-light-on-surface">
              Use target words in IELTS Task 2 topics &amp; mini tasks.
            </p>
          </div>
        </button>

        {/* 5. Speaking */}
        <button
          type="button"
          onClick={() => onSelectMode('speaking')}
          className="text-left rounded-[16px] bg-pastel-mint border border-light-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between gap-4 h-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-light-surface-container-lowest text-success flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                mic
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[12px] font-semibold whitespace-nowrap">
              Bonus XP
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">Speaking</h2>
            <p className="font-body text-[14px] text-light-on-surface">
              Record Part 1, 2 &amp; 3 answers using target word chips.
            </p>
          </div>
        </button>

        {/* 6. Reading */}
        <button
          type="button"
          onClick={() => onSelectMode('reading')}
          className="text-left rounded-[16px] bg-pastel-lavender border border-light-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between gap-4 h-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-light-surface-container-lowest text-light-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                menu_book
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[12px] font-semibold whitespace-nowrap">
              +20 XP
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">Reading</h2>
            <p className="font-body text-[14px] text-light-on-surface">
              Spot learned words in context &amp; answer IELTS questions.
            </p>
          </div>
        </button>

        {/* 7. Listening */}
        <button
          type="button"
          onClick={() => onSelectMode('listening')}
          className="text-left rounded-[16px] bg-light-surface-container-lowest border border-light-outline-variant p-6 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between gap-4 h-full sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between w-full">
            <span className="w-12 h-12 rounded-[12px] bg-pastel-mint text-light-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                headphones
              </span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-light-surface-container-low text-light-on-surface-variant font-label text-[12px] font-semibold whitespace-nowrap">
              +20 XP
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">Listening</h2>
            <p className="font-body text-[14px] text-light-on-surface">
              Listen to IELTS audio clips, answer, then reveal the transcript.
            </p>
          </div>
        </button>
      </section>
    </main>
  );
};
