import React, { useMemo, useState } from 'react';
import { VocabSection, VocabWord } from '../types';

interface QuizModeProps {
  section: VocabSection;
  onBack: () => void;
  onEarnXp: (amount: number, wordId: string) => void;
}

interface QuizQuestion {
  id: string;
  wordId: string;
  word: string;
  category: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function buildQuestions(words: VocabWord[]): QuizQuestion[] {
  return words.map((w, idx) => {
    const mode = idx % 3;
    const otherWords = words.filter((o) => o.id !== w.id);
    const distractors = [
      ...otherWords,
      {
        word: 'postpone',
        synonyms: 'delay, defer',
        collocation: 'postpone the deadline',
        definition: 'To arrange for an event to take place at a later time.',
      },
      {
        word: 'stabilize',
        synonyms: 'balance, steady',
        collocation: 'stabilize the currency',
        definition: 'To make or become unlikely to change, fail, or decline.',
      },
      {
        word: 'neglect',
        synonyms: 'ignore, disregard',
        collocation: 'neglect maintenance',
        definition: 'To fail to care for properly.',
      },
    ];

    if (mode === 0) {
      const primarySyn = w.synonyms.split(',')[0].trim();
      const opts = [
        primarySyn,
        distractors[0].synonyms.split(',')[0].trim(),
        distractors[1 % distractors.length].synonyms.split(',')[0].trim(),
        distractors[2 % distractors.length].synonyms.split(',')[0].trim(),
      ];
      const uniqueOpts = Array.from(new Set(opts));
      while (uniqueOpts.length < 4) uniqueOpts.push(`option ${uniqueOpts.length + 1}`);
      const shift = idx % 4;
      const rotated = [...uniqueOpts.slice(shift), ...uniqueOpts.slice(0, shift)];
      return {
        id: `q-${w.id}`,
        wordId: w.id,
        word: w.word,
        category: 'Synonym Check',
        prompt: `Which phrase is closest in meaning to "${w.word}"?`,
        options: rotated,
        correctIndex: rotated.indexOf(primarySyn),
        explanation: `${w.word} (${w.azerbaijani}) means "${w.definition}" Closest synonym: ${primarySyn}.`,
      };
    } else if (mode === 1) {
      const opts = [
        w.collocation,
        distractors[0].collocation,
        distractors[1 % distractors.length].collocation,
        distractors[2 % distractors.length].collocation,
      ];
      const uniqueOpts = Array.from(new Set(opts));
      while (uniqueOpts.length < 4) uniqueOpts.push(`academic ${uniqueOpts.length + 1}`);
      const shift = (idx + 1) % 4;
      const rotated = [...uniqueOpts.slice(shift), ...uniqueOpts.slice(0, shift)];
      return {
        id: `q-${w.id}`,
        wordId: w.id,
        word: w.word,
        category: 'Collocation Match',
        prompt: `Choose the natural IELTS collocation containing "${w.word}":`,
        options: rotated,
        correctIndex: rotated.indexOf(w.collocation),
        explanation: `"${w.collocation}" is a high-band academic collocation. Example: "${w.example}"`,
      };
    } else {
      const opts = [
        w.definition,
        distractors[0].definition,
        distractors[1 % distractors.length].definition,
        distractors[2 % distractors.length].definition,
      ];
      const uniqueOpts = Array.from(new Set(opts));
      while (uniqueOpts.length < 4) uniqueOpts.push(`Alternative meaning ${uniqueOpts.length + 1}`);
      const shift = (idx + 2) % 4;
      const rotated = [...uniqueOpts.slice(shift), ...uniqueOpts.slice(0, shift)];
      return {
        id: `q-${w.id}`,
        wordId: w.id,
        word: w.word,
        category: 'Meaning Check',
        prompt: `What is the accurate definition of "${w.word}"?`,
        options: rotated,
        correctIndex: rotated.indexOf(w.definition),
        explanation: `${w.word} means: ${w.definition} (AZ: ${w.azerbaijani}).`,
      };
    }
  });
}

export const QuizMode: React.FC<QuizModeProps> = ({
  section,
  onBack,
  onEarnXp,
}) => {
  const questions = useMemo(() => buildQuestions(section.words), [section.words]);
  const [view, setView] = useState<'question' | 'result'>('question');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const current = questions[currentIdx];
  const letters = ['A', 'B', 'C', 'D'];

  const totalCorrect = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const totalXpEarned = totalCorrect * 15;

  const handleSelectOption = (optIdx: number) => {
    if (!current || answers[current.id] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optIdx }));
    if (optIdx === current.correctIndex) {
      onEarnXp(15, current.wordId);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setView('result');
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentIdx(0);
    setView('question');
  };

  if (!current) return null;

  const selectedOption = answers[current.id];
  const hasAnswered = selectedOption !== undefined;

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Header & View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface hover:bg-light-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_back
            </span>
          </button>
          <h1 className="font-title text-[18px] font-semibold text-light-on-surface">
            Quiz Mode
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-full bg-light-surface-container-low border border-light-outline-variant">
          <button
            type="button"
            onClick={() => setView('question')}
            className={`px-4 py-1 rounded-full font-label text-[12px] font-semibold whitespace-nowrap transition-colors ${
              view === 'question'
                ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                : 'text-light-on-surface-variant'
            }`}
          >
            Question
          </button>
          <button
            type="button"
            onClick={() => setView('result')}
            className={`px-4 py-1 rounded-full font-label text-[12px] font-semibold whitespace-nowrap transition-colors ${
              view === 'result'
                ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                : 'text-light-on-surface-variant'
            }`}
          >
            Results
          </button>
        </div>
      </div>

      {view === 'question' ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-label text-[13px] font-semibold text-light-on-surface-variant tabular-nums">
              <span>
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span>{current.category}</span>
            </div>
            <div className="w-full h-3 bg-light-surface-container rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-light-primary to-light-secondary rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
            <h2 className="font-headline text-[22px] leading-[28px] font-semibold text-light-on-surface">
              {current.prompt}
            </h2>

            <div className="flex flex-col gap-2">
              {current.options.map((opt, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrectOpt = optIdx === current.correctIndex;

                let btnClass =
                  'border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface hover:bg-light-surface-container-low';
                if (hasAnswered) {
                  if (isCorrectOpt) {
                    btnClass = 'border-2 border-success bg-success-container text-on-success-container';
                  } else if (isSelected) {
                    btnClass = 'border-2 border-error bg-error-container text-on-error-container';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={hasAnswered}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left px-4 py-3.5 rounded-[12px] font-title text-[16px] font-semibold flex items-center justify-between gap-3 transition-colors ${btnClass}`}
                  >
                    <span>
                      {letters[optIdx]}. {opt}
                    </span>
                    {hasAnswered && isCorrectOpt && (
                      <span className="material-symbols-outlined material-symbols-filled text-success shrink-0" aria-hidden="true">
                        check_circle
                      </span>
                    )}
                    {hasAnswered && isSelected && !isCorrectOpt && (
                      <span className="material-symbols-outlined material-symbols-filled text-error shrink-0" aria-hidden="true">
                        cancel
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <>
                <div className="rounded-[12px] bg-light-surface-container-low p-4 flex flex-col gap-1">
                  <span className="font-label text-[12px] font-semibold text-light-secondary">
                    Explanation
                  </span>
                  <p className="font-body text-[14px] text-light-on-surface">{current.explanation}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95"
                  >
                    {currentIdx + 1 >= questions.length ? 'View Results' : 'Next Question →'}
                  </button>
                </div>
              </>
            )}
          </article>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="rounded-[16px] bg-gradient-to-r from-light-primary to-light-secondary p-6 text-light-on-primary shadow-md flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-label text-[13px] font-semibold opacity-90">
                Quiz Summary
              </span>
              <h2 className="font-display text-[28px] font-bold tabular-nums">
                {totalCorrect} / {questions.length} Correct
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-sunny-yellow text-on-sunny-yellow font-label text-[15px] font-semibold tabular-nums whitespace-nowrap">
              <span className="material-symbols-outlined material-symbols-filled text-[18px]" aria-hidden="true">
                bolt
              </span>
              <span>+{totalXpEarned} XP</span>
            </span>
          </div>

          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-title text-[18px] font-semibold text-light-on-surface">
                All Questions &amp; Correct Answers
              </h3>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-1.5 rounded-full border border-light-outline-variant font-label text-[13px] font-semibold text-light-on-surface hover:bg-light-surface-container-low"
              >
                Retake Quiz
              </button>
            </div>
            <div className="divide-y divide-light-outline-variant">
              {questions.map((q, idx) => {
                const userAns = answers[q.id];
                const isCorrect = userAns === q.correctIndex;
                return (
                  <div key={q.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-body text-[14px] text-light-on-surface">
                      {idx + 1}. {q.category}: <strong>{q.word}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      {userAns !== undefined && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-label text-[12px] font-semibold ${
                            isCorrect
                              ? 'bg-success-container text-on-success-container'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          {isCorrect ? 'Correct' : 'Missed'}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-success-container text-on-success-container font-label text-[12px] font-semibold">
                        {q.options[q.correctIndex]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      )}
    </main>
  );
};
