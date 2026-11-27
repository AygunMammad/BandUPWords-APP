import React, { useState } from 'react';
import { StudyState, UserProfile, VocabSection } from '../types';

interface HomeDashboardProps {
  user: UserProfile;
  sections: VocabSection[];
  studyState: StudyState;
  onSelectSection: (sectionId: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  sections,
  studyState,
  onSelectSection,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const totalLearned = Object.values(studyState.wordMastery).filter(
    (status) => status === 'learned' || status === 'active'
  ).length;

  const getSectionIconColor = (variant: VocabSection['accentVariant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-light-primary-container text-light-primary';
      case 'secondary':
        return 'bg-light-secondary-container text-light-secondary';
      case 'sunny':
        return 'bg-sunny-yellow-container text-on-sunny-yellow-container';
      case 'success':
        return 'bg-success-container text-on-success-container';
    }
  };

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-6 pt-6 pb-24 md:pb-8 flex flex-col gap-6">
      {/* Greeting Banner with Campus Illustration */}
      <section className="rounded-[12px] bg-light-surface-container-low border border-light-outline-variant p-6 shadow-sm grid grid-cols-1 md:grid-cols-12 items-center gap-4">
        <div className="md:col-span-7 flex flex-col gap-1.5">
          <p className="font-label text-[13px] font-semibold text-light-on-primary-container">
            Small daily steps build lasting fluency — ready to explore today?
          </p>
          <h1 className="font-headline text-[24px] leading-[30px] md:text-[30px] md:leading-[36px] font-bold tracking-tight text-light-on-surface text-balance">
            Welcome back, {user.firstName}
          </h1>
          <div className="pt-1.5 flex items-center gap-2 text-[13px] font-semibold text-light-on-surface">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-light-surface-container-lowest border border-light-outline-variant">
              <span className="material-symbols-outlined text-light-primary text-[16px]" aria-hidden="true">
                target
              </span>
              <span>Target: Band {user.targetBand}</span>
            </span>
          </div>
        </div>
        <div className="md:col-span-5">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/campus_study_desk_1795769769133.jpg"
              alt="Study desk with notebook, books, and headphones"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-36 object-cover rounded-[12px] border border-light-outline-variant"
            />
          ) : (
            <div className="w-full h-36 rounded-[12px] border border-light-outline-variant bg-light-surface-container-lowest flex flex-col items-center justify-center gap-1 text-light-primary">
              <span className="material-symbols-outlined text-[28px]" aria-hidden="true">
                menu_book
              </span>
              <span className="font-label text-[12px] font-semibold">IELTS Study Desk</span>
            </div>
          )}
        </div>
      </section>

      {/* Top Stats Row */}
      <section aria-label="Study statistics" className="grid grid-cols-3 gap-2 md:gap-4 items-stretch">
        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-4 shadow-sm flex flex-col gap-1 h-full">
          <div className="flex items-center gap-1.5 text-light-tertiary">
            <span className="material-symbols-outlined material-symbols-filled text-[18px] text-sunny-yellow" aria-hidden="true">
              bolt
            </span>
            <span className="font-label text-[13px] font-semibold text-light-on-surface-variant">Total XP</span>
          </div>
          <p className="font-headline text-[22px] leading-[28px] font-semibold text-light-on-surface tabular-nums">
            {studyState.xp.toLocaleString()}
          </p>
        </article>

        <article className="bg-sunny-yellow-container rounded-[16px] border border-sunny-yellow p-4 shadow-sm flex flex-col gap-1 h-full">
          <div className="flex items-center gap-1.5 text-on-sunny-yellow-container">
            <span className="material-symbols-outlined material-symbols-filled text-[18px]" aria-hidden="true">
              local_fire_department
            </span>
            <span className="font-label text-[13px] font-semibold">Daily Streak</span>
          </div>
          <p className="font-headline text-[22px] leading-[28px] font-semibold text-on-sunny-yellow-container tabular-nums">
            {studyState.currentStreak} days
          </p>
        </article>

        <article className="bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-4 shadow-sm flex flex-col gap-1 h-full">
          <div className="flex items-center gap-1.5 text-success">
            <span className="material-symbols-outlined material-symbols-filled text-[18px]" aria-hidden="true">
              check_circle
            </span>
            <span className="font-label text-[13px] font-semibold text-light-on-surface-variant">Learned</span>
          </div>
          <p className="font-headline text-[22px] leading-[28px] font-semibold text-light-on-surface tabular-nums">
            {totalLearned} words
          </p>
        </article>
      </section>

      {/* Vocabulary Sections List */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-headline text-[22px] leading-[28px] font-semibold text-light-on-surface">
            Your Vocabulary Sections
          </h2>
          <span className="font-label text-[13px] font-semibold text-light-on-surface-variant tabular-nums">
            {sections.length} {sections.length === 1 ? 'section' : 'sections'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {sections.map((section) => {
            const total = section.words.length;
            const learned = section.words.filter((w) => {
              const status = studyState.wordMastery[w.id];
              return status === 'learned' || status === 'active';
            }).length;
            const pct = total > 0 ? Math.round((learned / total) * 100) : 0;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className="text-left bg-light-surface-container-lowest rounded-[16px] border border-light-outline-variant p-6 shadow-sm hover:border-bright-blue hover:shadow-md transition-all duration-150 flex flex-col justify-between gap-4 h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary"
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="font-title text-[18px] leading-[24px] font-semibold text-light-on-surface break-words">
                      {section.name}
                    </h3>
                    <p className="font-body text-[14px] text-light-on-surface-variant tabular-nums">
                      {total} words · {learned} learned
                    </p>
                  </div>
                  <span
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${getSectionIconColor(
                      section.accentVariant
                    )}`}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      chevron_right
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between font-label text-[12px] font-semibold text-light-on-surface-variant tabular-nums">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-light-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-hot-pink to-bright-blue rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
};
