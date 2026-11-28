export type ScreenId =
  | 'login'
  | 'admin-login'
  | 'admin-panel'
  | 'home'
  | 'progress'
  | 'profile'
  | 'section-modes'
  | 'flashcards'
  | 'gap-fill'
  | 'quiz'
  | 'writing'
  | 'speaking'
  | 'reading'
  | 'listening';

export interface VocabWord {
  id: string;
  sectionId?: string;
  index: number;
  word: string;
  synonyms: string;
  azerbaijani: string;
  collocation: string;
  type: string;
  pronunciation: string;
  definition: string;
  example: string;
  source: string;
  ieltsLevel: string;
  topic: string;
}

export interface VocabSection {
  id: string;
  name: string;
  accentVariant: 'primary' | 'secondary' | 'sunny' | 'success';
  words: VocabWord[];
  readingPassage: {
    title: string;
    text: string;
    tfngQuestion: {
      statement: string;
      answer: 'True' | 'False' | 'Not Given';
      explanation: string;
    };
    blankQuestion: {
      sentenceBefore: string;
      sentenceAfter: string;
      answer: string;
      explanation: string;
    };
  };
  listeningClip: {
    sectionLabel: string;
    title: string;
    durationLabel: string;
    transcript: string;
    questionBefore: string;
    questionAfter: string;
    answer: string;
  };
}

export type WordMastery = 'new' | 'review' | 'learned' | 'active';

export interface UserProfile {
  firstName: string;
  lastName: string;
  targetBand: string;
}

export interface SkillCounts {
  speaking: number;
  writing: number;
  reading: number;
  listening: number;
}

export interface StudyState {
  xp: number;
  currentStreak: number;
  bestStreak: number;
  weeklyActivity: boolean[]; // Mon..Sun (7 days)
  wordMastery: Record<string, WordMastery>; // key: wordId
  skills: SkillCounts;
}
