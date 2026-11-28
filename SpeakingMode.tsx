import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VocabSection } from '../types';

interface SpeakingModeProps {
  section: VocabSection;
  onBack: () => void;
  onCompleteSpeaking: (xpAmount: number, usedWordIds: string[]) => void;
}

interface SpeakingPart {
  id: 'Part 1' | 'Part 2' | 'Part 3';
  subtitle: string;
  timeRange: string;
  maxSeconds: number;
  question: string;
  defaultTranscript: string;
}

const PARTS: SpeakingPart[] = [
  {
    id: 'Part 1',
    subtitle: 'Part 1 · Interview',
    timeRange: '0:30 – 0:45 min',
    maxSeconds: 45,
    question: 'Do people in your neighborhood care about recycling and green spaces?',
    defaultTranscript:
      'Yes, community awareness has grown rapidly. More residents try to mitigate plastic waste and support sustainable local parks.',
  },
  {
    id: 'Part 2',
    subtitle: 'Part 2 · Long Turn',
    timeRange: '1:00 – 2:00 min',
    maxSeconds: 120,
    question: 'Describe an environmental problem in your city and how it can be solved.',
    defaultTranscript:
      'In Baku, heavy traffic has become ubiquitous during rush hour, which tends to exacerbate air quality issues. To mitigate this, we need more sustainable metro lines and electric buses.',
  },
  {
    id: 'Part 3',
    subtitle: 'Part 3 · Discussion',
    timeRange: '1:00 – 1:30 min',
    maxSeconds: 90,
    question: 'How can governments incentivize citizens to adopt cleaner daily transport?',
    defaultTranscript:
      'Authorities can allocate funding to resilient public rail networks and make eco-friendly options more affordable so private cars do not proliferate unnecessarily.',
  },
];

function highlightWords(text: string, targetWords: string[]) {
  if (!targetWords.length) return text;
  const escaped = targetWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})[a-z]*\\b`, 'gi');
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <mark
        key={`${match.index}-${match[0]}`}
        className="px-1 rounded-[4px] bg-success-container text-on-success-container font-medium"
      >
        {match[0]}
      </mark>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export const SpeakingMode: React.FC<SpeakingModeProps> = ({
  section,
  onBack,
  onCompleteSpeaking,
}) => {
  const [partId, setPartId] = useState<SpeakingPart['id']>('Part 2');
  const activePart = PARTS.find((p) => p.id === partId) ?? PARTS[1];

  const [transcript, setTranscript] = useState(activePart.defaultTranscript);
  const [recording, setRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusLabel, setStatusLabel] = useState('Tap microphone to record or edit transcript below');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [awarded, setAwarded] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    feedback: string;
    modelAnswer: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const targetWords = useMemo(() => {
    const base = section.words.slice(0, 8).map((w) => w.word.toLowerCase());
    const defaults = ['mitigate', 'exacerbate', 'sustainable', 'ubiquitous', 'resilient', 'proliferate', 'alleviate', 'emission'];
    return Array.from(new Set([...base, ...defaults])).slice(0, 8);
  }, [section.words]);

  const usedWords = useMemo(() => {
    const lower = transcript.toLowerCase();
    return targetWords.filter((w) => new RegExp(`\\b${w.slice(0, Math.max(4, w.length - 1))}`, 'i').test(lower));
  }, [transcript, targetWords]);

  const missedWords = useMemo(
    () => targetWords.filter((w) => !usedWords.includes(w)),
    [targetWords, usedWords]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleSelectPart = (part: SpeakingPart) => {
    if (recording) stopRecording();
    setPartId(part.id);
    setTranscript(part.defaultTranscript);
    setElapsedSeconds(0);
    setAiFeedback(null);
    setErrorMsg(null);
    setAwarded(false);
    setStatusLabel('Tap microphone to record or edit transcript below');
  };

  const stopRecording = () => {
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setStatusLabel('Recording complete · Tap to re-record');
  };

  const startRecording = () => {
    setRecording(true);
    setElapsedSeconds(0);
    setStatusLabel('Listening... speak clearly');

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((s) => {
        if (s + 1 >= activePart.maxSeconds) {
          stopRecording();
          return activePart.maxSeconds;
        }
        return s + 1;
      });
    }, 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
          let combined = '';
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript + ' ';
          }
          if (combined.trim()) {
            setTranscript(combined.trim());
          }
        };
        rec.onerror = () => {
          setStatusLabel('Microphone unavailable in browser — edit transcript directly below');
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        setStatusLabel('Timer active · Type or dictate your spoken response below');
      }
    } else {
      setStatusLabel('Timer active · Speech recognition unavailable, type or paste transcript below');
    }
  };

  const toggleMic = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleEvaluate = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setErrorMsg(null);

    const matchedIds = section.words
      .filter((w) => usedWords.includes(w.word.toLowerCase()))
      .map((w) => w.id);
    if (!awarded) {
      setAwarded(true);
      onCompleteSpeaking(30, matchedIds);
    }

    try {
      const resp = await fetch('/api/evaluate-speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part: activePart.id,
          prompt: activePart.question,
          targetWords,
          transcript,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Could not retrieve AI speaking feedback.');
      } else {
        setAiFeedback(data);
      }
    } catch {
      setErrorMsg('Network error while connecting to the speaking evaluator.');
    } finally {
      setLoading(false);
    }
  };

  const formatSec = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Header & Part Tabs */}
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
            Speaking Mode
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-full bg-light-surface-container-low border border-light-outline-variant">
          {PARTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPart(p)}
              className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
                partId === p.id
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant'
              }`}
            >
              {p.id}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cue Card, Target Words, Mic Recorder */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1 rounded-full bg-light-primary-container text-light-on-primary-container font-label text-[12px] font-semibold">
                {activePart.subtitle}
              </span>
              <span className="font-mono text-[14px] font-medium text-light-secondary tabular-nums">
                {activePart.timeRange}
              </span>
            </div>
            <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
              {activePart.question}
            </h2>
          </section>

          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-title text-[16px] font-semibold text-light-on-surface">
                Target words
              </h3>
              <span className="px-3.5 py-1 rounded-full bg-success-container text-on-success-container font-label text-[12px] font-semibold tabular-nums">
                Words used: {usedWords.length} / {targetWords.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {targetWords.map((word) => {
                const isUsed = usedWords.includes(word);
                return (
                  <span
                    key={word}
                    className={`px-3 py-1 rounded-full border font-label text-[13px] font-semibold ${
                      isUsed
                        ? 'bg-success-container border-success text-on-success-container'
                        : 'bg-light-surface-container-low border-light-outline-variant text-light-on-surface'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          </section>

          {/* Microphone Recorder */}
          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col items-center text-center gap-4">
            <span className="font-mono text-[22px] font-semibold text-light-on-surface tabular-nums">
              {formatSec(elapsedSeconds)} / {formatSec(activePart.maxSeconds)}
            </span>
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Record speaking answer"
              className={`w-20 h-20 rounded-full text-light-on-primary shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-150 ${
                recording
                  ? 'bg-error'
                  : 'bg-gradient-to-br from-light-primary to-light-secondary'
              }`}
            >
              <span className="material-symbols-outlined material-symbols-filled text-[28px]" aria-hidden="true">
                {recording ? 'stop' : 'mic'}
              </span>
            </button>
            <p className="font-label text-[13px] font-semibold text-light-on-surface-variant">
              {statusLabel}
            </p>
          </section>
        </div>

        {/* Right: Transcript, Missed Words, Feedback & Model Answer */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-title text-[18px] font-semibold text-light-on-surface">
                Live Transcript
              </h3>
              <span className="px-3.5 py-1 rounded-full bg-sunny-yellow-container text-on-sunny-yellow-container font-label text-[12px] font-semibold tabular-nums">
                {awarded ? '+30 XP earned' : '+30 XP'}
              </span>
            </div>

            <p className="font-body text-[14px] text-light-on-surface leading-relaxed">
              &ldquo;{highlightWords(transcript, targetWords)}&rdquo;
            </p>

            <textarea
              rows={3}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              aria-label="Edit spoken transcript"
              placeholder="Your spoken response appears here (you can also type or refine it directly)..."
              className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest p-3 font-body text-[13px] text-light-on-surface focus:border-light-primary focus:outline-none"
            />

            <button
              type="button"
              disabled={loading || !transcript.trim()}
              onClick={handleEvaluate}
              className="w-full py-3 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {loading ? 'Analyzing Speaking with Gemini...' : 'Evaluate Speaking'}
            </button>

            <p className="font-label text-[12px] font-semibold text-light-on-surface-variant">
              <strong>Missed target words:</strong>{' '}
              {missedWords.length > 0 ? missedWords.join(', ') : 'None — all target words used!'}
            </p>

            {errorMsg && (
              <div className="rounded-[12px] border border-error bg-error-container text-on-error-container p-3 font-body text-[13px]">
                {errorMsg}
              </div>
            )}

            <div className="rounded-[12px] bg-light-surface-container-low p-4 flex flex-col gap-1">
              <span className="font-label text-[12px] font-semibold text-light-secondary">
                AI Speaking Feedback
              </span>
              <p className="font-body text-[14px] text-light-on-surface">
                {loading
                  ? 'Evaluating lexical resource and fluency...'
                  : aiFeedback?.feedback
                  ? aiFeedback.feedback
                  : 'Record or refine your response, then click "Evaluate Speaking" for personalized IELTS examiner feedback.'}
              </p>
            </div>

            {aiFeedback?.modelAnswer && (
              <div className="rounded-[12px] bg-light-surface-container-lowest border border-light-outline-variant p-4 flex flex-col gap-1">
                <span className="font-label text-[12px] font-semibold text-light-primary">
                  Model Answer
                </span>
                <p className="font-body text-[14px] text-light-on-surface">
                  &ldquo;{highlightWords(aiFeedback.modelAnswer, targetWords)}&rdquo;
                </p>
              </div>
            )}
          </article>
        </div>
      </div>
    </main>
  );
};
