import React, { useState } from 'react';
import { StudyState, UserProfile, VocabSection } from '../types';

interface ProgressViewProps {
  studyState: StudyState;
  sections: VocabSection[];
}

export const ProgressView: React.FC<ProgressViewProps> = ({ studyState, sections }) => {
  const allWords = sections.flatMap((s) => s.words);
  const learnedCount = allWords.filter((w) => {
    const m = studyState.wordMastery[w.id];
    return m === 'learned' || m === 'active';
  }).length;
  const reviewCount = Math.max(0, allWords.length - learnedCount);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const maxSkill = Math.max(
    1,
    studyState.skills.speaking,
    studyState.skills.writing,
    studyState.skills.reading,
    studyState.skills.listening
  );

  const masteryList = allWords.slice(0, 8);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      <h1 className="font-headline text-[24px] md:text-[30px] font-bold text-light-on-surface">
        Your Progress
      </h1>

      {/* Top Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-4 shadow-sm flex flex-col gap-1">
          <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
            Total XP
          </span>
          <p className="font-headline text-[22px] font-semibold text-light-on-surface tabular-nums">
            {studyState.xp.toLocaleString()} XP
          </p>
        </article>
        <article className="bg-sunny-yellow-container rounded-[16px] border border-sunny-yellow p-4 shadow-sm flex flex-col gap-1">
          <span className="font-label text-[12px] font-semibold text-on-sunny-yellow-container">
            Current Streak
          </span>
          <p className="font-headline text-[22px] font-semibold text-on-sunny-yellow-container tabular-nums">
            {studyState.currentStreak} days
          </p>
        </article>
        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-4 shadow-sm flex flex-col gap-1">
          <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
            Best Streak
          </span>
          <p className="font-headline text-[22px] font-semibold text-light-on-surface tabular-nums">
            {studyState.bestStreak} days
          </p>
        </article>
        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-4 shadow-sm flex flex-col gap-1">
          <span className="font-label text-[12px] font-semibold text-light-on-surface-variant">
            Learned / To Review
          </span>
          <p className="font-headline text-[22px] font-semibold text-success tabular-nums">
            {learnedCount}{' '}
            <span className="text-light-on-surface-variant text-[16px]">/ {reviewCount}</span>
          </p>
        </article>
      </section>

      {/* Weekly Activity Calendar + Skill Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col justify-between gap-4">
          <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
            Weekly Activity
          </h2>
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayLabels.map((lbl, i) => {
              const active = studyState.weeklyActivity[i];
              const isTodayHighlight = i === 5 && active;
              return (
                <div key={`${lbl}-${i}`} className="flex flex-col items-center gap-1.5">
                  {active ? (
                    isTodayHighlight ? (
                      <span className="w-9 h-9 rounded-full bg-sunny-yellow-container border border-sunny-yellow text-on-sunny-yellow-container flex items-center justify-center">
                        <span className="material-symbols-outlined material-symbols-filled text-[18px]" aria-hidden="true">
                          local_fire_department
                        </span>
                      </span>
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-light-primary to-light-secondary text-light-on-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          check
                        </span>
                      </span>
                    )
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-light-surface-container text-light-on-surface flex items-center justify-center font-label text-[12px] font-semibold">
                      -
                    </span>
                  )}
                  <span className="font-label text-[12px] font-semibold">{lbl}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
          <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
            Skill Usage
          </h2>
          <div className="flex flex-col gap-3">
            {[
              { name: 'Speaking', value: `${studyState.skills.speaking} words used`, count: studyState.skills.speaking, barClass: 'bg-success' },
              { name: 'Writing', value: `${studyState.skills.writing} words used`, count: studyState.skills.writing, barClass: 'bg-gradient-to-r from-light-primary to-light-secondary' },
              { name: 'Reading', value: `${studyState.skills.reading} words met`, count: studyState.skills.reading, barClass: 'bg-bright-blue' },
              { name: 'Listening', value: `${studyState.skills.listening} words met`, count: studyState.skills.listening, barClass: 'bg-hot-pink' },
            ].map((skill) => (
              <div key={skill.name} className="flex flex-col gap-1">
                <div className="flex justify-between font-label text-[13px] font-semibold tabular-nums">
                  <span>{skill.name}</span>
                  <span>{skill.value}</span>
                </div>
                <div className="w-full h-2.5 bg-light-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-full ${skill.barClass} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(100, Math.round((skill.count / maxSkill) * 92))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* Per-Section Progress + Word Mastery List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
          <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
            Section Progress
          </h2>
          <div className="flex flex-col gap-3">
            {sections.map((sec) => {
              const learned = sec.words.filter((w) => {
                const m = studyState.wordMastery[w.id];
                return m === 'learned' || m === 'active';
              }).length;
              const pct = sec.words.length > 0 ? Math.round((learned / sec.words.length) * 100) : 0;
              return (
                <div key={sec.id} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-2 font-label text-[13px] font-semibold tabular-nums">
                    <span className="break-all">{sec.name}</span>
                    <span className="shrink-0">
                      {learned}/{sec.words.length}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-light-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-hot-pink to-bright-blue rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-4">
          <h2 className="font-title text-[18px] font-semibold text-light-on-surface">
            Word Mastery Status
          </h2>
          <div className="divide-y divide-light-outline-variant">
            {masteryList.map((w) => {
              const status = studyState.wordMastery[w.id] ?? 'new';
              const badge =
                status === 'active'
                  ? { label: 'Used actively in Writing/Speaking', cls: 'bg-success-container text-on-success-container' }
                  : status === 'learned'
                  ? { label: 'Learned', cls: 'bg-light-secondary-container text-light-on-secondary-container' }
                  : status === 'review'
                  ? { label: 'Needs review', cls: 'bg-sunny-yellow-container text-on-sunny-yellow-container' }
                  : { label: 'New', cls: 'bg-light-surface-container text-light-on-surface-variant' };

              return (
                <div key={w.id} className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-title text-[16px] font-semibold text-light-on-surface">
                    {w.word}
                  </span>
                  <span className={`px-3 py-0.5 rounded-full font-label text-[12px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </main>
  );
};

interface ProfileViewProps {
  user: UserProfile;
  studyState: StudyState;
  onUpdateProfile: (user: UserProfile) => void;
  onResetProgress: () => void;
  onSignOut: () => void;
  onOpenAdminLogin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  studyState,
  onUpdateProfile,
  onResetProgress,
  onSignOut,
  onOpenAdminLogin,
}) => {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [targetBand, setTargetBand] = useState(user.targetBand);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      firstName: firstName.trim() || 'Leyla',
      lastName: lastName.trim() || 'Mammadova',
      targetBand,
    });
    setSavedMsg('Profile preferences saved.');
    setTimeout(() => setSavedMsg(null), 2500);
  };

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      <h1 className="font-headline text-[24px] md:text-[30px] font-bold text-light-on-surface">
        Student Profile
      </h1>

      <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-light-primary to-light-secondary text-light-on-primary flex items-center justify-center font-display text-[22px] font-bold">
            {(user.firstName[0] || 'L').toUpperCase()}
            {(user.lastName[0] || 'M').toUpperCase()}
          </div>
          <div>
            <h2 className="font-title text-[20px] font-semibold text-light-on-surface">
              {user.firstName} {user.lastName}
            </h2>
            <p className="font-body text-[14px] text-light-on-surface-variant tabular-nums">
              {studyState.xp.toLocaleString()} XP · {studyState.currentStreak}-day study streak · Target Band {user.targetBand}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4 border-t border-light-outline-variant pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-label text-[13px] font-semibold text-light-on-surface">
                First name
              </span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label text-[13px] font-semibold text-light-on-surface">
                Last name
              </span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 font-body text-[15px] text-light-on-surface focus:border-light-primary focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-label text-[13px] font-semibold text-light-on-surface">
              Target IELTS Band
            </span>
            <div className="flex flex-wrap gap-2">
              {['6.5', '7.0', '7.5', '8.0', '8.5'].map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setTargetBand(band)}
                  className={`px-4 py-2 rounded-full font-label text-[13px] font-semibold tabular-nums transition-colors ${
                    targetBand === band
                      ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                      : 'bg-light-surface-container-low text-light-on-surface hover:bg-light-surface-container'
                  }`}
                >
                  Band {band}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary font-label text-[14px] font-semibold shadow-sm hover:opacity-95"
            >
              Save Changes
            </button>
            {savedMsg && (
              <span className="font-label text-[13px] font-semibold text-success">{savedMsg}</span>
            )}
          </div>
        </form>
      </section>

      <section className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onResetProgress}
            className="px-4 py-2 rounded-full border border-light-outline-variant font-label text-[13px] font-semibold text-light-on-surface hover:bg-light-surface-container-low"
          >
            Reset Study Progress
          </button>
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="px-4 py-2 rounded-full border border-light-outline-variant font-label text-[13px] font-semibold text-light-on-surface hover:bg-light-surface-container-low"
          >
            Admin Portal
          </button>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="px-4 py-2 rounded-full bg-error-container text-on-error-container font-label text-[13px] font-semibold"
        >
          Sign Out
        </button>
      </section>
    </main>
  );
};
