import React from 'react';
import { ScreenId } from '../types';

interface AppShellProps {
  activeTab: 'home' | 'progress' | 'profile';
  xp: number;
  streak: number;
  xpBonusLabel?: string;
  onNavigate: (screen: ScreenId) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  xp,
  streak,
  xpBonusLabel,
  onNavigate,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-light-surface text-light-on-surface">
      {/* Desktop Top Navigation Bar */}
      <header className="hidden md:flex sticky top-0 z-30 bg-light-surface-container-lowest border-b border-light-outline-variant">
        <div className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary rounded-lg"
          >
            <span className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-hot-pink to-bright-blue flex items-center justify-center text-light-on-primary">
              <span className="material-symbols-outlined material-symbols-filled text-[18px]" aria-hidden="true">
                auto_stories
              </span>
            </span>
            <span className="font-display text-[18px] font-semibold text-light-on-surface">
              BandUp Words
            </span>
          </button>

          <nav aria-label="Primary navigation" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              aria-current={activeTab === 'home' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
                activeTab === 'home'
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant hover:bg-light-surface-container-low'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  activeTab === 'home' ? 'material-symbols-filled' : ''
                }`}
                aria-hidden="true"
              >
                home
              </span>
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('progress')}
              aria-current={activeTab === 'progress' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
                activeTab === 'progress'
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant hover:bg-light-surface-container-low'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  activeTab === 'progress' ? 'material-symbols-filled' : ''
                }`}
                aria-hidden="true"
              >
                bar_chart
              </span>
              <span>Progress</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-current={activeTab === 'profile' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-label text-[13px] font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-light-primary to-light-secondary text-light-on-primary'
                  : 'text-light-on-surface-variant hover:bg-light-surface-container-low'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  activeTab === 'profile' ? 'material-symbols-filled' : ''
                }`}
                aria-hidden="true"
              >
                person
              </span>
              <span>Profile</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sunny-yellow-container text-on-sunny-yellow-container border border-sunny-yellow font-label text-[13px] font-semibold tabular-nums whitespace-nowrap">
              <span className="material-symbols-outlined material-symbols-filled text-[15px]" aria-hidden="true">
                local_fire_department
              </span>
              <span>{streak}d</span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-light-secondary-container text-light-on-secondary-container font-label text-[13px] font-semibold tabular-nums whitespace-nowrap">
              <span className="material-symbols-outlined material-symbols-filled text-[15px]" aria-hidden="true">
                bolt
              </span>
              <span>{xpBonusLabel ? xpBonusLabel : `${xp.toLocaleString()} XP`}</span>
            </span>
          </div>
        </div>
      </header>

      {children}

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-light-surface-container-lowest border-t border-light-outline-variant px-6 py-2"
      >
        <div className="flex items-center justify-around">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            aria-current={activeTab === 'home' ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 min-w-[56px] py-1 ${
              activeTab === 'home' ? 'text-light-primary' : 'text-light-on-surface-variant'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                activeTab === 'home' ? 'material-symbols-filled' : ''
              }`}
              aria-hidden="true"
            >
              home
            </span>
            <span className="font-label text-[12px] font-semibold">Home</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('progress')}
            aria-current={activeTab === 'progress' ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 min-w-[56px] py-1 ${
              activeTab === 'progress' ? 'text-light-primary' : 'text-light-on-surface-variant'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                activeTab === 'progress' ? 'material-symbols-filled' : ''
              }`}
              aria-hidden="true"
            >
              bar_chart
            </span>
            <span className="font-label text-[12px] font-semibold">Progress</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 min-w-[56px] py-1 ${
              activeTab === 'profile' ? 'text-light-primary' : 'text-light-on-surface-variant'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                activeTab === 'profile' ? 'material-symbols-filled' : ''
              }`}
              aria-hidden="true"
            >
              person
            </span>
            <span className="font-label text-[12px] font-semibold">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
