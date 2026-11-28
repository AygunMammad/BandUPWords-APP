import { useEffect, useState } from 'react';
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
import { ScreenId, StudyState, UserProfile, VocabSection } from './types';

const STORAGE_USER_KEY = 'bandup_user_v1';
const STORAGE_STUDY_KEY = 'bandup_study_v1';

function loadInitialUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.firstName === 'string') {
      return {
        firstName: parsed.firstName,
        lastName: parsed.lastName || '',
        targetBand: parsed.targetBand || '7.5',
      };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function loadInitialStudyState(): StudyState {
  try {
    const raw = localStorage.getItem(STORAGE_STUDY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.xp === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_STUDY_STATE;
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => loadInitialUser());
  const [sections, setSections] = useState<VocabSection[]>(SEED_SECTIONS);
  const [studyState, setStudyState] = useState<StudyState>(() => loadInitialStudyState());

  // Admin auth token stays strictly in React memory (never persisted to browser storage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');

  const [screen, setScreen] = useState<ScreenId>(() => {
    if (window.location.hash === '#admin') return 'admin-login';
    return loadInitialUser() ? 'home' : 'login';
  });
  const [activeSectionId, setActiveSectionId] = useState<string>(SEED_SECTIONS[0]?.id ?? '');

  // Load persistent vocabulary sections from SQLite backend
  useEffect(() => {
    let mounted = true;
    fetch('/api/sections')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections);
          setActiveSectionId((prev) =>
            data.sections.some((s: VocabSection) => s.id === prev) ? prev : data.sections[0].id
          );
        }
      })
      .catch(() => {
        // fallback stays SEED_SECTIONS
      });
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

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STUDY_KEY, JSON.stringify(studyState));
    } catch {
      // ignore
    }
  }, [studyState]);

  const activeSection =
    sections.find((s) => s.id === activeSectionId) ?? sections[0] ?? SEED_SECTIONS[0];

  const handleLogin = (firstName: string, lastName: string) => {
    setUser((prev) => ({
      firstName,
      lastName,
      targetBand: prev?.targetBand || '7.5',
    }));
    setScreen('home');
  };

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

  if (screen === 'login' || !user) {
    return (
      <LoginView
        initialFirstName={user?.firstName}
        initialLastName={user?.lastName}
        onLogin={handleLogin}
        onOpenAdminLogin={openAdminLogin}
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
        <ProgressView studyState={studyState} sections={sections} />
      )}

      {screen === 'profile' && (
        <ProfileView
          user={user}
          studyState={studyState}
          onUpdateProfile={(updated) => setUser(updated)}
          onResetProgress={() => setStudyState(INITIAL_STUDY_STATE)}
          onSignOut={() => {
            setUser(null);
            setScreen('login');
          }}
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
