import React, { useEffect, useRef, useState } from 'react';
import { VocabSection } from '../types';

interface ReadingListeningModeProps {
  section: VocabSection;
  initialTab: 'reading' | 'listening';
  onBack: () => void;
  onCompleteSkill: (skill: 'reading' | 'listening', xpAmount: number, wordIds: string[]) => void;
}

function renderHighlightedPassage(text: string, words: string[]) {
  if (words.length === 0) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})[a-z]*\\b`, 'gi');
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <mark
        key={`${match.index}-${match[0]}`}
        className="px-1 rounded-[4px] bg-sunny-yellow-container text-on-sunny-yellow-container font-medium"
      >
        {match[0]}
      </mark>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export const ReadingListeningMode: React.FC<ReadingListeningModeProps> = ({
  section,
  initialTab,
  onBack,
  onCompleteSkill,
}) => {
  const [mode, setMode] = useState<'reading' | 'listening'>(initialTab);
  const [tfngChoice, setTfngChoice] = useState<'True' | 'False' | 'Not Given' | null>(null);
  const [readingBlank, setReadingBlank] = useState('');
  const [readingBlankChecked, setReadingBlankChecked] = useState(false);
  const [readingAwarded, setReadingAwarded] = useState(false);

  // Listening state
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(0);
  const speeds = [1.0, 1.25, 0.75];
  const [progressPct, setProgressPct] = useState(0);
  const [listeningBlank, setListeningBlank] = useState('');
  const [listeningSubmitted, setListeningSubmitted] = useState(false);
  const [listeningAwarded, setListeningAwarded] = useState(false);
  const timerRef = useRef<number | null>(null);

  const sectionWords = section.words.map((w) => w.word);
  const reading = section.readingPassage;
  const listening = section.listeningClip;

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleSelectTfng = (choice: 'True' | 'False' | 'Not Given') => {
    setTfngChoice(choice);
    if (choice === reading.tfngQuestion.answer && !readingAwarded) {
      setReadingAwarded(true);
      onCompleteSkill('reading', 20, section.words.slice(0, 3).map((w) => w.id));
    }
  };

  const handleCheckReadingBlank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingBlank.trim()) return;
    setReadingBlankChecked(true);
    if (
      readingBlank.trim().toLowerCase() === reading.blankQuestion.answer.toLowerCase() &&
      !readingAwarded
    ) {
      setReadingAwarded(true);
      onCompleteSkill('reading', 20, section.words.slice(0, 3).map((w) => w.id));
    }
  };

  const startAudioPlayback = (rate: number) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setPlaying(true);
    setProgressPct(0);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(listening.transcript);
      u.lang = 'en-GB';
      u.rate = rate;
      u.onend = () => {
        setPlaying(false);
        setProgressPct(100);
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
      window.speechSynthesis.speak(u);
    }

    const durationMs = Math.max(4000, Math.round((listening.transcript.length * 65) / rate));
    const stepMs = 150;
    const increment = (stepMs / durationMs) * 100;
    timerRef.current = window.setInterval(() => {
      setProgressPct((prev) => {
        if (prev + increment >= 100) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setPlaying(false);
          return 100;
        }
        return prev + increment;
      });
    }, stepMs);
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (timerRef.current) window.clearInterval(timerRef.current);
    } else {
      startAudioPlayback(speeds[speedIdx]);
    }
  };

  const handleReplay = () => {
    startAudioPlayback(speeds[speedIdx]);
  };

  const handleCycleSpeed = () => {
    const nextIdx = (speedIdx + 1) % speeds.length;
    setSpeedIdx(nextIdx);
    if (playing) {
      startAudioPlayback(speeds[nextIdx]);
    }
  };

  const handleCheckListening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listeningBlank.trim()) return;
    setListeningSubmitted(true);
    if (
      listeningBlank.trim().toLowerCase() === listening.answer.toLowerCase() &&
      !listeningAwarded
    ) {
      setListeningAwarded(true);
      onCompleteSkill('listening', 20, section.words.slice(0, 3).map((w) => w.id));
    }
  };

  const elapsedSeconds = Math.round((progressPct / 100) * 105);
  const elapsedFormatted = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Header + Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4">
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
          <h1 className="font-headline text-[24px] md:text-[30px] font-bold text-light-on-surface">
            Reading &amp; Listening
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-full bg-light-surface-container-low border border-light-outline-variant">
          <button
            type="button"
            onClick={() => setMode('reading')}
            className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
              mode === 'reading'
                ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                : 'text-light-on-surface-variant'
            }`}
          >
            Reading
          </button>
          <button
            type="button"
            onClick={() => setMode('listening')}
            className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
              mode === 'listening'
                ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                : 'text-light-on-surface-variant'
            }`}
          >
            Listening
          </button>
        </div>
      </div>

      {mode === 'reading' ? (
        <section className="flex flex-col gap-4">
          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <span className="self-start px-3.5 py-1 rounded-full bg-light-secondary-container text-light-on-secondary-container font-label text-[12px] font-semibold">
              {reading.title} · Learned words highlighted
            </span>
            <p className="font-body text-[16px] leading-relaxed text-light-on-surface max-w-prose">
              {renderHighlightedPassage(reading.text, sectionWords)}
            </p>
          </article>

          {/* Q1: True / False / Not Given */}
          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <span className="font-label text-[12px] font-semibold text-light-primary">
              Q1 · True / False / Not Given
            </span>
            <p className="font-title text-[16px] font-semibold text-light-on-surface">
              {reading.tfngQuestion.statement}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['True', 'False', 'Not Given'] as const).map((opt) => {
                const isSelected = tfngChoice === opt;
                const isCorrect = opt === reading.tfngQuestion.answer;
                let cls = 'border border-light-outline-variant bg-light-surface-container-lowest text-light-on-surface hover:bg-light-surface-container-low';
                if (tfngChoice) {
                  if (isCorrect) {
                    cls = 'border-2 border-success bg-success-container text-on-success-container';
                  } else if (isSelected) {
                    cls = 'border-2 border-error bg-error-container text-on-error-container';
                  }
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectTfng(opt)}
                    className={`py-2.5 rounded-[12px] font-label text-[13px] font-semibold transition-colors ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {tfngChoice && (
              <div
                className={`rounded-[12px] p-3 font-body text-[14px] ${
                  tfngChoice === reading.tfngQuestion.answer
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                <strong>
                  {tfngChoice === reading.tfngQuestion.answer ? 'Correct' : 'Answer'}:{' '}
                  {reading.tfngQuestion.answer}.
                </strong>{' '}
                {reading.tfngQuestion.explanation}
              </div>
            )}
          </article>

          {/* Q2: Fill in the blank */}
          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <span className="font-label text-[12px] font-semibold text-light-secondary">
              Q2 · Fill in the blank
            </span>
            <p className="font-body text-[15px] text-light-on-surface">
              {reading.blankQuestion.sentenceBefore}{' '}
              <span className="inline-block px-2.5 py-0.5 rounded-[6px] bg-light-surface-container font-semibold text-light-secondary">
                {readingBlankChecked ? reading.blankQuestion.answer : '________'}
              </span>{' '}
              {reading.blankQuestion.sentenceAfter}
            </p>
            <form onSubmit={handleCheckReadingBlank} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={readingBlank}
                onChange={(e) => setReadingBlank(e.target.value)}
                placeholder="Type the missing word..."
                className="flex-1 rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[14px] text-light-on-surface focus:border-light-primary focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[13px] font-semibold whitespace-nowrap"
              >
                Check
              </button>
            </form>
            {readingBlankChecked && (
              <p
                className={`font-body text-[14px] ${
                  readingBlank.trim().toLowerCase() === reading.blankQuestion.answer.toLowerCase()
                    ? 'text-success'
                    : 'text-error'
                }`}
              >
                <strong>
                  {readingBlank.trim().toLowerCase() === reading.blankQuestion.answer.toLowerCase()
                    ? 'Correct'
                    : 'Correct answer'}
                  : {reading.blankQuestion.answer}
                </strong>{' '}
                — {reading.blankQuestion.explanation}
              </p>
            )}
          </article>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          {/* Audio Player */}
          <article className="rounded-[16px] bg-gradient-to-r from-light-primary to-light-secondary p-6 text-light-on-primary shadow-md flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-label text-[12px] font-semibold opacity-90">
                  {listening.sectionLabel}
                </p>
                <h2 className="font-title text-[18px] font-semibold">{listening.title}</h2>
              </div>
              <button
                type="button"
                onClick={handleCycleSpeed}
                className="px-3.5 py-1 rounded-full bg-light-surface-container-lowest text-light-on-surface font-label text-[13px] font-semibold tabular-nums"
              >
                {speeds[speedIdx].toFixed(2).replace(/\.00$/, '.0')}x
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={togglePlay}
                aria-label="Play or pause audio"
                className="w-12 h-12 shrink-0 rounded-full bg-light-surface-container-lowest text-light-primary flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined material-symbols-filled text-[22px]" aria-hidden="true">
                  {playing ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleReplay}
                aria-label="Replay audio"
                className="w-10 h-10 shrink-0 rounded-full bg-light-surface-container-lowest text-light-on-surface flex items-center justify-center hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  replay
                </span>
              </button>
              <div className="flex-1 flex flex-col gap-1">
                <div className="w-full h-2 bg-light-surface-container-lowest/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sunny-yellow rounded-full transition-all duration-150"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[12px] tabular-nums opacity-90">
                  <span>{elapsedFormatted}</span>
                  <span>{listening.durationLabel}</span>
                </div>
              </div>
            </div>
          </article>

          {/* Listening Question */}
          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <span className="font-label text-[12px] font-semibold text-light-primary">
              Fill in the blank (ONE WORD)
            </span>
            <p className="font-body text-[15px] text-light-on-surface">
              {listening.questionBefore}{' '}
              <span className="inline-block px-2.5 py-0.5 rounded-[6px] bg-light-surface-container font-semibold text-light-secondary">
                {listeningSubmitted ? listening.answer : '________'}
              </span>{' '}
              {listening.questionAfter}
            </p>
            <form onSubmit={handleCheckListening} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={listeningBlank}
                onChange={(e) => setListeningBlank(e.target.value)}
                placeholder="Type one word from the audio..."
                className="flex-1 rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[14px] text-light-on-surface focus:border-light-primary focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[13px] font-semibold whitespace-nowrap"
              >
                Check &amp; Unlock
              </button>
            </form>

            {listeningSubmitted && (
              <div
                className={`rounded-[12px] p-3 font-body text-[14px] ${
                  listeningBlank.trim().toLowerCase() === listening.answer.toLowerCase()
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                {listeningBlank.trim().toLowerCase() === listening.answer.toLowerCase() ? (
                  <>
                    <strong>Correct: {listening.answer}</strong> — +20 XP earned! Transcript unlocked below.
                  </>
                ) : (
                  <>
                    <strong>Answer: {listening.answer}</strong> — Transcript unlocked below so you can review.
                  </>
                )}
              </div>
            )}
          </article>

          {/* Transcript Card */}
          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-title text-[16px] font-semibold text-light-on-surface">
                Transcript
              </h3>
              <span
                className={`font-label text-[12px] font-semibold ${
                  listeningSubmitted ? 'text-success' : 'text-light-on-surface-variant'
                }`}
              >
                {listeningSubmitted ? 'Unlocked' : 'Locked until answer submitted'}
              </span>
            </div>
            {listeningSubmitted ? (
              <p className="font-body text-[14px] text-light-on-surface leading-relaxed">
                &ldquo;{renderHighlightedPassage(listening.transcript, sectionWords)}&rdquo;
              </p>
            ) : (
              <p className="font-body text-[14px] text-light-on-surface-variant italic">
                Listen to the audio clip and submit your answer above to reveal the full transcript with highlighted vocabulary.
              </p>
            )}
          </article>
        </section>
      )}
    </main>
  );
};
