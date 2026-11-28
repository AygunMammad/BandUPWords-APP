import React, { useMemo, useState } from 'react';
import { VocabSection } from '../types';

interface WritingModeProps {
  section: VocabSection;
  onBack: () => void;
  onCompleteWriting: (xpAmount: number, usedWordIds: string[]) => void;
}

interface TopicConfig {
  id: 'Environment' | 'Education' | 'Technology' | 'Health';
  prompt: string;
  miniTask1Prompt: string;
  miniTask1Default: string;
  miniTask2Prompt: string;
  miniTask2Default: string;
  defaultEssay: string;
  extraWords: string[];
}

const TOPICS: TopicConfig[] = [
  {
    id: 'Environment',
    prompt:
      'Many cities face worsening air pollution due to rapid urbanization. What are the main causes, and what measures can governments take to solve this problem?',
    miniTask1Prompt: '"Reduce the harm" →',
    miniTask1Default: 'alleviate the harm',
    miniTask2Prompt: '"______ growth" →',
    miniTask2Default: 'sustainable',
    defaultEssay:
      'Private cars have become ubiquitous in big cities, which continues to exacerbate air pollution. To mitigate this crisis, authorities must invest in sustainable public transport networks and create green zones.',
    extraWords: ['mitigate', 'exacerbate', 'sustainable', 'ubiquitous', 'resilient', 'proliferate'],
  },
  {
    id: 'Education',
    prompt:
      'Some argue that universities should prioritize practical career skills over theoretical academic study. To what extent do you agree or disagree?',
    miniTask1Prompt: '"Reduce the gap" →',
    miniTask1Default: 'narrow the disparity',
    miniTask2Prompt: '"______ critical thinking" →',
    miniTask2Default: 'foster',
    defaultEssay:
      'While vocational training helps students adapt quickly, universities must still foster critical thinking and modernize the curriculum so graduates remain resilient in changing job markets.',
    extraWords: ['foster', 'curriculum', 'disparity', 'imperative', 'allocate', 'resilient'],
  },
  {
    id: 'Technology',
    prompt:
      'Artificial intelligence and automation are transforming modern workplaces. Do the advantages of this trend outweigh the disadvantages?',
    miniTask1Prompt: '"Make tasks faster" →',
    miniTask1Default: 'streamline daily tasks',
    miniTask2Prompt: '"Data ______" →',
    miniTask2Default: 'privacy',
    defaultEssay:
      'Automation has become indispensable for global companies because it can streamline workflows and drive innovation, although rapid change can render older skills obsolete and raise privacy concerns.',
    extraWords: ['indispensable', 'streamline', 'innovation', 'obsolete', 'privacy', 'ubiquitous'],
  },
  {
    id: 'Health',
    prompt:
      'Sedentary lifestyles are increasingly common in urban areas. What factors contribute to this issue, and how can public health campaigns encourage active living?',
    miniTask1Prompt: '"Harmful impact" →',
    miniTask1Default: 'detrimental effect',
    miniTask2Prompt: '"______ funding" →',
    miniTask2Default: 'allocate',
    defaultEssay:
      'Desk-based jobs and screen habits have a detrimental effect on public health. Governments should allocate funding to neighborhood parks to mitigate chronic illness and build resilient communities.',
    extraWords: ['detrimental', 'allocate', 'mitigate', 'resilient', 'sustainable', 'proliferate'],
  },
];

function highlightUsedWords(text: string, targetWords: string[]) {
  if (!targetWords.length) return text;
  const escaped = targetWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escaped.join('|')})[a-z]*\\b`, 'gi');
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
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
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export const WritingMode: React.FC<WritingModeProps> = ({
  section,
  onBack,
  onCompleteWriting,
}) => {
  const [topicId, setTopicId] = useState<TopicConfig['id']>('Environment');
  const activeTopic = TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];

  const [essay, setEssay] = useState(activeTopic.defaultEssay);
  const [mini1, setMini1] = useState(activeTopic.miniTask1Default);
  const [mini2, setMini2] = useState(activeTopic.miniTask2Default);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [aiResult, setAiResult] = useState<{
    feedback: string;
    needsFix: string;
    modelAnswer: string;
    miniTaskFeedback: string;
  } | null>(null);

  const targetWords = useMemo(() => {
    const fromSection = section.words.slice(0, 6).map((w) => w.word.toLowerCase());
    if (topicId === 'Environment' && fromSection.length >= 4) {
      return Array.from(new Set([...fromSection, ...activeTopic.extraWords])).slice(0, 6);
    }
    return activeTopic.extraWords;
  }, [section.words, topicId, activeTopic.extraWords]);

  const usedWords = useMemo(() => {
    const lower = essay.toLowerCase();
    return targetWords.filter((w) => new RegExp(`\\b${w.slice(0, Math.max(4, w.length - 1))}`, 'i').test(lower));
  }, [essay, targetWords]);

  const missedWords = useMemo(
    () => targetWords.filter((w) => !usedWords.includes(w)),
    [targetWords, usedWords]
  );

  const wordCount = useMemo(() => {
    const trimmed = essay.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [essay]);

  const handleSelectTopic = (t: TopicConfig) => {
    setTopicId(t.id);
    setEssay(t.defaultEssay);
    setMini1(t.miniTask1Default);
    setMini2(t.miniTask2Default);
    setHasChecked(false);
    setAiResult(null);
    setErrorMsg(null);
  };

  const handleCheckAnswer = async () => {
    setHasChecked(true);
    setErrorMsg(null);
    setLoading(true);

    const matchedIds = section.words
      .filter((w) => usedWords.includes(w.word.toLowerCase()))
      .map((w) => w.id);
    onCompleteWriting(40, matchedIds);

    try {
      const resp = await fetch('/api/evaluate-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeTopic.id,
          prompt: activeTopic.prompt,
          targetWords,
          essayText: essay,
          miniTasks: [
            { label: 'Paraphrase with synonym', answer: mini1 },
            { label: 'Complete collocation', answer: mini2 },
          ],
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Could not retrieve AI evaluation.');
      } else {
        setAiResult(data);
      }
    } catch {
      setErrorMsg('Network error while connecting to the evaluation server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Header */}
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
          <h1 className="font-headline text-[24px] md:text-[30px] font-bold text-light-on-surface">
            Writing Mode
          </h1>
        </div>
      </div>

      {/* Topic Picker */}
      <div className="flex flex-wrap items-center gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleSelectTopic(t)}
            className={`px-4 py-1.5 rounded-full font-label text-[13px] font-semibold whitespace-nowrap transition-colors ${
              topicId === t.id
                ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                : 'bg-light-surface-container-lowest border border-light-outline-variant text-light-on-surface-variant hover:bg-light-surface-container-low'
            }`}
          >
            {t.id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prompt, Target Words, Editor & Mini Tasks */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-2">
            <span className="self-start px-3.5 py-1 rounded-full bg-light-secondary-container text-light-on-secondary-container font-label text-[12px] font-semibold">
              IELTS Task 2 Essay · {activeTopic.id}
            </span>
            <p className="font-body text-[16px] leading-[26px] text-light-on-surface">
              {activeTopic.prompt}
            </p>
          </section>

          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-title text-[16px] font-semibold text-light-on-surface">
                Target words
              </h2>
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
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border font-label text-[13px] font-semibold ${
                      isUsed
                        ? 'bg-success-container border-success text-on-success-container'
                        : 'bg-light-surface-container-low border-light-outline-variant text-light-on-surface'
                    }`}
                  >
                    {isUsed && (
                      <span className="material-symbols-outlined text-[15px] text-success" aria-hidden="true">
                        check_circle
                      </span>
                    )}
                    <span>{word}</span>
                  </span>
                );
              })}
            </div>
          </section>

          <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="essay-input" className="font-title text-[16px] font-semibold text-light-on-surface">
                Your response
              </label>
              <span className="font-label text-[12px] font-semibold text-light-on-surface-variant tabular-nums">
                {wordCount} words
              </span>
            </div>
            <textarea
              id="essay-input"
              rows={5}
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Write your IELTS Task 2 paragraph using the target words above..."
              className="w-full rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest p-4 font-body text-[14px] text-light-on-surface focus:border-bright-blue focus:ring-2 focus:ring-light-secondary-container focus:outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-[12px] bg-light-surface-container-low p-3 flex flex-col gap-1">
                <span className="font-label text-[12px] font-semibold text-light-on-surface">
                  Mini Task 1 · Paraphrase with synonym
                </span>
                <p className="font-body text-[13px] text-light-on-surface">
                  {activeTopic.miniTask1Prompt}
                </p>
                <input
                  type="text"
                  value={mini1}
                  onChange={(e) => setMini1(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-light-outline-variant px-2.5 py-1.5 text-[14px] bg-light-surface-container-lowest focus:border-light-primary focus:outline-none"
                />
              </div>

              <div className="rounded-[12px] bg-light-surface-container-low p-3 flex flex-col gap-1">
                <span className="font-label text-[12px] font-semibold text-light-secondary">
                  Mini Task 2 · Complete collocation
                </span>
                <p className="font-body text-[13px] text-light-on-surface">
                  {activeTopic.miniTask2Prompt}
                </p>
                <input
                  type="text"
                  value={mini2}
                  onChange={(e) => setMini2(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-light-outline-variant px-2.5 py-1.5 text-[14px] bg-light-surface-container-lowest focus:border-light-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={loading || !essay.trim()}
              onClick={handleCheckAnswer}
              className="mt-1 w-full py-3.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[15px] font-semibold shadow-md hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {loading ? 'Evaluating with Gemini...' : 'Check my answer'}
            </button>
          </section>
        </div>

        {/* Right Column: Evaluation Results */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <article className="rounded-[16px] bg-gradient-to-r from-light-primary to-light-secondary p-6 text-light-on-primary shadow-md flex items-center justify-between gap-3">
            <div>
              <p className="font-label text-[12px] font-semibold opacity-90">Vocabulary Usage Score</p>
              <p className="font-headline text-[22px] font-semibold tabular-nums">
                {usedWords.length} / {targetWords.length} Target Words
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-sunny-yellow text-on-sunny-yellow font-label text-[13px] font-semibold tabular-nums whitespace-nowrap">
              {hasChecked ? '+40 XP earned' : '+40 XP'}
            </span>
          </article>

          <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
            <h3 className="font-title text-[16px] font-semibold text-light-on-surface">
              Your Text Highlighted
            </h3>
            <p className="font-body text-[14px] leading-relaxed text-light-on-surface">
              {essay.trim() ? highlightUsedWords(essay, targetWords) : 'Start typing your paragraph to see target vocabulary highlighted live.'}
            </p>

            <div className="flex flex-col gap-1 text-[13px] font-semibold">
              <p className="text-success">
                Used correctly: {usedWords.length > 0 ? usedWords.join(', ') : 'None yet'}
              </p>
              {missedWords.length > 0 && (
                <p className="text-light-on-surface-variant">
                  Missed: {missedWords.join(', ')}
                </p>
              )}
              {aiResult?.needsFix && (
                <p className="text-error">Needs fix: {aiResult.needsFix}</p>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-[12px] border border-error bg-error-container text-on-error-container p-3.5 font-body text-[13px]">
                {errorMsg}
              </div>
            )}

            <div className="rounded-[12px] bg-light-surface-container-low p-4 flex flex-col gap-1">
              <span className="font-label text-[12px] font-semibold text-light-secondary">
                AI Feedback · Grammar, Vocab &amp; Task
              </span>
              <p className="font-body text-[14px] text-light-on-surface">
                {loading
                  ? 'Analyzing your essay structure, collocations, and task response...'
                  : aiResult?.feedback
                  ? aiResult.feedback
                  : 'Click "Check my answer" to receive personalized IELTS Writing feedback from Gemini.'}
              </p>
            </div>

            {aiResult?.modelAnswer && (
              <div className="rounded-[12px] bg-light-surface-container-lowest border border-light-outline-variant p-4 flex flex-col gap-1">
                <span className="font-label text-[12px] font-semibold text-light-primary">
                  Model Answer (with Target Words)
                </span>
                <p className="font-body text-[14px] text-light-on-surface">
                  {highlightUsedWords(aiResult.modelAnswer, targetWords)}
                </p>
                {aiResult.miniTaskFeedback && (
                  <p className="font-label text-[12px] font-semibold text-success pt-1">
                    Mini tasks: {aiResult.miniTaskFeedback}
                  </p>
                )}
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
};
