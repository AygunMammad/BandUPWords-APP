import React, { useMemo, useState } from 'react';
import { VocabSection, VocabWord } from '../types';

interface GapFillModeProps {
  section: VocabSection;
  onBack: () => void;
  onEarnXp: (amount: number, wordId: string) => void;
}

type TaskTab = 'gap' | 'az-en' | 'en-az';

function buildGapSentence(w: VocabWord): { before: string; after: string } {
  const regex = new RegExp(`\\b${w.word}[a-z]*\\b`, 'i');
  const match = w.example.match(regex);
  if (!match || match.index === undefined) {
    return {
      before: `In academic writing, we often use "${w.collocation.replace(w.word, '________')}" to express:`,
      after: w.definition.toLowerCase(),
    };
  }
  const before = w.example.slice(0, match.index);
  const after = w.example.slice(match.index + match[0].length);
  return { before, after };
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/[.,!?;:"'()]/g, '');
}

export const GapFillMode: React.FC<GapFillModeProps> = ({
  section,
  onBack,
  onEarnXp,
}) => {
  const words = section.words;
  const [activeTab, setActiveTab] = useState<TaskTab>('gap');
  const [idx, setIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [checkedResult, setCheckedResult] = useState<{
    submitted: string;
    expected: string;
    isCorrect: boolean;
  } | null>(null);

  const current = words[idx];
  const gapParts = useMemo(() => (current ? buildGapSentence(current) : { before: '', after: '' }), [current]);

  if (!current) return null;

  const getExpected = (tab: TaskTab, w: VocabWord): string => {
    if (tab === 'en-az') return w.azerbaijani;
    return w.word;
  };

  const handleSwitchTab = (tab: TaskTab) => {
    setActiveTab(tab);
    setInputValue('');
    setCheckedResult(null);
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const expected = getExpected(activeTab, current);
    const normUser = normalizeAnswer(inputValue);
    let isCorrect = false;

    if (activeTab === 'en-az') {
      const variants = expected.split(',').map((s) => normalizeAnswer(s));
      isCorrect = variants.some((v) => v === normUser || (normUser.length >= 4 && v.includes(normUser)));
    } else {
      isCorrect = normUser === normalizeAnswer(expected);
    }

    if (isCorrect && !checkedResult) {
      onEarnXp(15, current.id);
    }
    setCheckedResult({
      submitted: inputValue.trim(),
      expected,
      isCorrect,
    });
  };

  const handleNextWord = () => {
    setIdx((i) => (i + 1) % words.length);
    setInputValue('');
    setCheckedResult(null);
  };

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Top Bar */}
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
          <h1 className="font-title text-[18px] font-semibold text-light-on-surface">
            Gap-fill &amp; Translation
          </h1>
          <span className="font-label text-[13px] font-semibold text-light-on-surface-variant tabular-nums">
            {idx + 1} / {words.length}
          </span>
        </div>
        <div className="w-full h-3 bg-light-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-hot-pink to-bright-blue rounded-full transition-all duration-300"
            style={{ width: `${((idx + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-light-surface-container-low border border-light-outline-variant">
        <button
          type="button"
          onClick={() => handleSwitchTab('gap')}
          className={`py-2 px-2 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'gap'
              ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
              : 'text-light-on-surface-variant hover:text-light-on-surface'
          }`}
        >
          Gap-fill
        </button>
        <button
          type="button"
          onClick={() => handleSwitchTab('az-en')}
          className={`py-2 px-2 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'az-en'
              ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
              : 'text-light-on-surface-variant hover:text-light-on-surface'
          }`}
        >
          AZ → EN
        </button>
        <button
          type="button"
          onClick={() => handleSwitchTab('en-az')}
          className={`py-2 px-2 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'en-az'
              ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
              : 'text-light-on-surface-variant hover:text-light-on-surface'
          }`}
        >
          EN → AZ
        </button>
      </div>

      {/* Active Task Card */}
      <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3.5 py-1 rounded-full bg-light-secondary-container text-light-on-secondary-container font-label text-[12px] font-semibold">
            {activeTab === 'gap'
              ? 'Fill in the blank'
              : activeTab === 'az-en'
              ? 'Azerbaijani → English'
              : 'English → Azerbaijani'}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sunny-yellow-container text-on-sunny-yellow-container border border-sunny-yellow font-label text-[12px] font-semibold tabular-nums">
            <span className="material-symbols-outlined material-symbols-filled text-[14px]" aria-hidden="true">
              bolt
            </span>
            <span>+15 XP</span>
          </span>
        </div>

        {activeTab === 'gap' && (
          <p className="font-body text-[16px] leading-relaxed text-light-on-surface">
            &ldquo;{gapParts.before}
            <span className="inline-block px-3 py-0.5 rounded-[8px] bg-light-surface-container font-label text-[13px] font-semibold text-light-secondary mx-1">
              {checkedResult ? current.word : '________'}
            </span>
            {gapParts.after}&rdquo;
          </p>
        )}

        {activeTab === 'az-en' && (
          <div className="rounded-[12px] bg-light-surface-container-low p-4">
            <p className="font-label text-[12px] font-semibold text-light-on-surface-variant mb-1">
              Translate into English:
            </p>
            <p className="font-headline text-[22px] font-semibold text-light-on-surface">
              {current.azerbaijani}
            </p>
          </div>
        )}

        {activeTab === 'en-az' && (
          <div className="rounded-[12px] bg-light-surface-container-low p-4">
            <p className="font-label text-[12px] font-semibold text-light-on-surface-variant mb-1">
              Translate into Azerbaijani:
            </p>
            <p className="font-headline text-[22px] font-semibold text-light-on-surface">
              {current.word}
            </p>
          </div>
        )}

        <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              activeTab === 'gap'
                ? 'Type the missing word...'
                : activeTab === 'az-en'
                ? 'Type English translation...'
                : 'Type Azerbaijani translation...'
            }
            className={`flex-1 rounded-[12px] border bg-light-surface-container-lowest px-4 py-2.5 font-body text-[16px] text-light-on-surface focus:outline-none focus:ring-2 ${
              checkedResult
                ? checkedResult.isCorrect
                  ? 'border-success focus:ring-success-container'
                  : 'border-error focus:ring-error-container'
                : 'border-light-outline-variant focus:border-bright-blue focus:ring-light-secondary-container'
            }`}
          />
          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[15px] font-semibold shadow-sm hover:opacity-95 whitespace-nowrap"
          >
            Check
          </button>
        </form>

        {/* Automatic Instant Comparison Below Input */}
        {checkedResult && (
          <div
            className={`rounded-[12px] border p-4 flex flex-col gap-3 ${
              checkedResult.isCorrect
                ? 'border-success bg-success-container text-on-success-container'
                : 'border-error bg-error-container text-on-error-container'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined material-symbols-filled text-[18px] ${
                    checkedResult.isCorrect ? 'text-success' : 'text-error'
                  }`}
                  aria-hidden="true"
                >
                  {checkedResult.isCorrect ? 'check_circle' : 'cancel'}
                </span>
                <span className="font-title text-[16px] font-semibold">
                  {checkedResult.isCorrect ? 'Correct! +15 XP earned' : 'Not quite — compare below'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-label text-[13px] font-semibold">
                <span
                  className={`px-2 py-0.5 rounded-[8px] bg-light-surface-container-lowest border ${
                    checkedResult.isCorrect ? 'text-success border-success' : 'text-error border-error'
                  }`}
                >
                  Your answer: {checkedResult.submitted}
                </span>
                <span className="px-2 py-0.5 rounded-[8px] bg-success text-on-success">
                  Correct: {checkedResult.expected}
                </span>
              </div>
            </div>

            <div
              className={`border-t pt-3 flex flex-col gap-1 ${
                checkedResult.isCorrect ? 'border-success' : 'border-error'
              }`}
            >
              <p className="font-body text-[14px]">
                <strong>Definition:</strong> {current.definition}
              </p>
              <p className="font-body text-[14px] italic">
                <strong>Example:</strong> &ldquo;{current.example}&rdquo;
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNextWord}
                className="px-5 py-2 rounded-full bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface font-label text-[13px] font-semibold hover:bg-light-surface-container-low"
              >
                Next word →
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
