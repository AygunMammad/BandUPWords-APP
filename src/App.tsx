import { useEffect, useRef, useState } from 'react';
import { AdminLoginView, AdminPanelView } from './components/AdminAuthAndPanel';
import { AppShell } from './components/AppShell';
import { FlashcardsMode } from './components/FlashcardsMode';
import { GapFillMode } from './components/GapFillMode';
import { HomeDashboard } from './components/HomeDashboard';
import { LoginView } from './components/LoginView';
import { ProfileView, ProgressView } from './components/ProgressAndProfile';
import { QuizMode } from './components/QuizMode';
import { ReadingListeningMode } from './components/ReadingListeningMode';
import { SectionModesView } from './components/SectionModesView';
import { SpeakingMode } from './components/SpeakingMode';
import { WritingMode } from './components/WritingMode';
import { INITIAL_STUDY_STATE, SEED_SECTIONS } from './data/seedVocabulary';
import { supabase } from './lib/supabase';
import {
  fetchSectionsFromSupabase,
  loadOrCreateUserRecord,
  saveUserRecord,
} from './lib/supabaseData';
import { ScreenId, StudyState, UserProfile, VocabSection } from './types';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sections, setSections] = useState<VocabSection[]>(SEED_SECTIONS);
  const [studyState, setStudyState] = useState<StudyState>(INITIAL_STUDY_STATE);

  // Prevent saving initial empty/default state before Supabase hydration finishes
  const hydratedUserIdRef = useRef<string | null>(null);

  // Admin auth token stays strictly in React memory (never persisted to browser storage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');

  const [screen, setScreen] = useState<ScreenId>(() => {
    if (window.location.hash === '#admin') return 'admin-login';
    return 'login';
  });
  const [activeSectionId, setActiveSectionId] = useState<string>(SEED_SECTIONS[0]?.id ?? '');

  // Subscribe to Supabase Auth session (handles Google OAuth redirect & session persistence)
  useEffect(() => {
    let mounted = true;

    const syncAuthSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          if (mounted) setAuthError(error.message);
        }

        if (session?.user) {
          const record = await loadOrCreateUserRecord(session.user);
          if (!mounted) return;
          hydratedUserIdRef.current = session.user.id;
          setUser(record.profile);
          setStudyState(record.studyState);
          setScreen((prev) =>
            prev === 'login' ? 'home' : prev
          );
        } else if (mounted) {
          hydratedUserIdRef.current = null;
          setUser(null);
          setStudyState(INITIAL_STUDY_STATE);
        }
      } catch (err) {
        if (mounted) {
          setAuthError(
            err instanceof Error ? err.message : 'Could not load your profile.'
          );
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    syncAuthSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        hydratedUserIdRef.current = null;
        setUser(null);
        setStudyState(INITIAL_STUDY_STATE);
        setScreen((prev) =>
          prev === 'admin-login' || prev === 'admin-panel' ? prev : 'login'
        );
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (hydratedUserIdRef.current === session.user.id) {
          return;
        }
        // IMPORTANT: do not await Supabase calls directly inside onAuthStateChange (auth lock deadlock).
        // Defer the profile load to the next tick, outside the auth callback.
        setTimeout(async () => {
        try {
          const record = await loadOrCreateUserRecord(session.user);
          if (!mounted) return;
          hydratedUserIdRef.current = session.user.id;
          setUser(record.profile);
          setStudyState(record.studyState);
          setAuthError(null);
          setScreen((prev) => (prev === 'login' ? 'home' : prev));
        } catch (err) {
          if (mounted) {
            setAuthError(
              err instanceof Error ? err.message : 'Could not load your profile.'
            );
          }
        } finally {
          if (mounted) setAuthLoading(false);
        }
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load persistent vocabulary sections from Supabase (with /api/sections fallback)
  useEffect(() => {
    let mounted = true;

    const loadSections = async () => {
      try {
        const supaSections = await fetchSectionsFromSupabase();
        if (mounted && supaSections && supaSections.length > 0) {
          setSections(supaSections);
          setActiveSectionId((prev) =>
            supaSections.some((s) => s.id === prev) ? prev : supaSections[0].id
          );
          return;
        }
      } catch {
        // fall through to /api/sections
      }

      try {
        const res = await fetch('/api/sections');
        const data = res.ok ? await res.json() : null;
        if (mounted && data && Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections);
          setActiveSectionId((prev) =>
            data.sections.some((s: VocabSection) => s.id === prev) ? prev : data.sections[0].id
          );
        }
      } catch {
        // fallback stays SEED_SECTIONS
      }
    };

    loadSections();

    return () => {
      mounted = false;
    };
  }, []);

  // Support #admin direct route hash
  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#admin') {
        setScreen(adminToken ? 'admin-panel' : 'admin-login');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [adminToken]);

  // Persist user profile & study state to Supabase whenever they change
  useEffect(() => {
    const userId = user?.id;
    if (!userId || hydratedUserIdRef.current !== userId) {
      return;
    }

    const timer = window.setTimeout(() => {
      saveUserRecord(userId, user, studyState).catch(() => {
        // silent background sync retry on next change
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [user, studyState]);

  const activeSection =
    sections.find((s) => s.id === activeSectionId) ?? sections[0] ?? SEED_SECTIONS[0];

  const handleMarkFlashcard = (wordId: string, known: boolean) => {
    setStudyState((prev) => {
      const existing = prev.wordMastery[wordId];
      const nextStatus = known ? (existing === 'active' ? 'active' : 'learned') : 'review';
      const nextWeekly = [...prev.weeklyActivity];
      nextWeekly[5] = true;
      return {
        ...prev,
        xp: known ? prev.xp + 10 : prev.xp,
        weeklyActivity: nextWeekly,
        wordMastery: {
          ...prev.wordMastery,
          [wordId]: nextStatus,
        },
      };
    });
  };

  const handleEarnXp = (amount: number, wordId: string) => {
    setStudyState((prev) => {
      const existing = prev.wordMastery[wordId];
      const nextWeekly = [...prev.weeklyActivity];
      nextWeekly[5] = true;
      return {
        ...prev,
        xp: prev.xp + amount,
        weeklyActivity: nextWeekly,
        wordMastery: {
          ...prev.wordMastery,
          [wordId]: existing === 'active' ? 'active' : 'learned',
        },
      };
    });
  };

  const handleCompleteSkill = (
    skill: 'reading' | 'listening' | 'writing' | 'speaking',
    xpAmount: number,
    wordIds: string[]
  ) => {
    setStudyState((prev) => {
      const nextMastery = { ...prev.wordMastery };
      wordIds.forEach((id) => {
        if (skill === 'writing' || skill === 'speaking') {
          nextMastery[id] = 'active';
        } else if (nextMastery[id] !== 'active') {
          nextMastery[id] = 'learned';
        }
      });
      const nextWeekly = [...prev.weeklyActivity];
      nextWeekly[5] = true;
      return {
        ...prev,
        xp: prev.xp + xpAmount,
        weeklyActivity: nextWeekly,
        wordMastery: nextMastery,
        skills: {
          ...prev.skills,
          [skill]: prev.skills[skill] + Math.max(1, wordIds.length),
        },
      };
    });
  };

  const handleSignOut = async () => {
    hydratedUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setStudyState(INITIAL_STUDY_STATE);
    setScreen('login');
  };

  const openAdminLogin = () => {
    if (adminToken) {
      setScreen('admin-panel');
    } else {
      setScreen('admin-login');
    }
  };

  if (screen === 'admin-login' || (screen === 'admin-panel' && !adminToken)) {
    return (
      <AdminLoginView
        onAuthenticated={(token, email) => {
          setAdminToken(token);
          setAdminEmail(email);
          setScreen('admin-panel');
        }}
        onBackToStudentLogin={() => {
          if (window.location.hash === '#admin') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setScreen(user ? 'profile' : 'login');
        }}
      />
    );
  }

  if (screen === 'admin-panel' && adminToken) {
    return (
      <AdminPanelView
        adminToken={adminToken}
        adminEmail={adminEmail}
        sections={sections}
        onSectionsUpdated={(updated) => setSections(updated)}
        onSessionExpired={() => {
          setAdminToken(null);
          setAdminEmail('');
          setScreen('admin-login');
        }}
        onExitAdmin={() => {
          if (window.location.hash === '#admin') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          setScreen(user ? 'home' : 'login');
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-light-surface text-light-on-surface gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-light-primary-container border-t-light-primary animate-spin" />
        <p className="font-label text-[14px] font-semibold text-light-on-surface-variant">
          Loading your BandUp Words account...
        </p>
      </div>
    );
  }

  if (screen === 'login' || !user) {
    return (
      <LoginView
        onOpenAdminLogin={openAdminLogin}
        authError={authError}
      />
    );
  }

  const activeTab: 'home' | 'progress' | 'profile' =
    screen === 'progress' ? 'progress' : screen === 'profile' ? 'profile' : 'home';

  const bonusLabel =
    screen === 'flashcards'
      ? '+10 XP / card'
      : screen === 'writing'
      ? '+40 Bonus XP'
      : screen === 'speaking'
      ? '+30 Bonus XP'
      : undefined;

  return (
    <AppShell
      activeTab={activeTab}
      xp={studyState.xp}
      streak={studyState.currentStreak}
      xpBonusLabel={bonusLabel}
      onNavigate={(target) => setScreen(target)}
    >
      {screen === 'home' && (
        <HomeDashboard
          user={user}
          sections={sections}
          studyState={studyState}
          onSelectSection={(secId) => {
            setActiveSectionId(secId);
            setScreen('section-modes');
          }}
        />
      )}

      {screen === 'progress' && (
        <ProgressView
          studyState={studyState}
          sections={sections}
          currentUserId={user.id}
        />
      )}

      {screen === 'profile' && (
        <ProfileView
          user={user}
          studyState={studyState}
          onUpdateProfile={(updated) => setUser(updated)}
          onResetProgress={() => setStudyState(INITIAL_STUDY_STATE)}
          onSignOut={handleSignOut}
          onOpenAdminLogin={openAdminLogin}
        />
      )}

      {screen === 'section-modes' && (
        <SectionModesView
          section={activeSection}
          onBack={() => setScreen('home')}
          onSelectMode={(mode) => setScreen(mode)}
        />
      )}

      {screen === 'flashcards' && (
        <FlashcardsMode
          section={activeSection}
          onBack={() => setScreen('section-modes')}
          onMarkWord={handleMarkFlashcard}
        />
      )}

      {screen === 'gap-fill' && (
        <GapFillMode
          section={activeSection}
          onBack={() => setScreen('section-modes')}
          onEarnXp={handleEarnXp}
        />
      )}

      {screen === 'quiz' && (
        <QuizMode
          section={activeSection}
          onBack={() => setScreen('section-modes')}
          onEarnXp={handleEarnXp}
        />
      )}

      {screen === 'writing' && (
        <WritingMode
          section={activeSection}
          onBack={() => setScreen('section-modes')}
          onCompleteWriting={(xp, wordIds) => handleCompleteSkill('writing', xp, wordIds)}
        />
      )}

      {screen === 'speaking' && (
        <SpeakingMode
          section={activeSection}
          onBack={() => setScreen('section-modes')}
          onCompleteSpeaking={(xp, wordIds) => handleCompleteSkill('speaking', xp, wordIds)}
        />
      )}

      {(screen === 'reading' || screen === 'listening') && (
        <ReadingListeningMode
          section={activeSection}
          initialTab={screen}
          onBack={() => setScreen('section-modes')}
          onCompleteSkill={(skill, xp, wordIds) => handleCompleteSkill(skill, xp, wordIds)}
        />
      )}
    </AppShell>
  );
}
