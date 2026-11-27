import { StudyState, VocabSection } from '../types';

// TEMPORARY placeholder. Replace with your original seedVocabulary.ts if you have it.
export const SEED_SECTIONS: VocabSection[] = [
  {
    id: 'section-1',
    name: 'Education',
    accentVariant: 'primary',
    words: [
      {
        id: 'w-1-1', sectionId: 'section-1', index: 1,
        word: 'curriculum', synonyms: 'syllabus, course of study',
        azerbaijani: 'tədris proqramı', collocation: 'national curriculum',
        type: 'noun', pronunciation: '/kəˈrɪkjələm/',
        definition: 'The subjects taught in a school or university.',
        example: 'The curriculum was updated to include digital skills.',
        source: 'IELTS', ieltsLevel: 'Band 6.5', topic: 'Education',
      },
      {
        id: 'w-1-2', sectionId: 'section-1', index: 2,
        word: 'enrol', synonyms: 'register, sign up',
        azerbaijani: 'qeydiyyatdan keçmək', collocation: 'enrol in a course',
        type: 'verb', pronunciation: '/ɪnˈrəʊl/',
        definition: 'To officially join a course or institution.',
        example: 'She enrolled in an advanced English course.',
        source: 'IELTS', ieltsLevel: 'Band 6.5', topic: 'Education',
      },
      {
        id: 'w-1-3', sectionId: 'section-1', index: 3,
        word: 'tuition', synonyms: 'teaching, instruction',
        azerbaijani: 'təhsil haqqı / dərs', collocation: 'tuition fees',
        type: 'noun', pronunciation: '/tjuˈɪʃn/',
        definition: 'Teaching, or the fee paid for it.',
        example: 'Tuition fees have risen sharply in recent years.',
        source: 'IELTS', ieltsLevel: 'Band 7', topic: 'Education',
      },
    ],
    readingPassage: {
      title: 'Modern Education',
      text: 'Universities now offer flexible curricula, and many students enrol in online courses while paying lower tuition fees.',
      tfngQuestion: {
        statement: 'Online courses are always more expensive than on-campus courses.',
        answer: 'False',
        explanation: 'The passage says tuition fees for online courses are lower.',
      },
      blankQuestion: {
        sentenceBefore: 'Many students',
        sentenceAfter: 'in online courses.',
        answer: 'enrol',
        explanation: 'The passage uses "enrol" for joining a course.',
      },
    },
    listeningClip: {
      sectionLabel: 'Section 1',
      title: 'Course Registration',
      durationLabel: '0:45',
      transcript: 'Hello, I would like to enrol in the evening English course. What are the tuition fees?',
      questionBefore: 'The caller wants to',
      questionAfter: 'in the evening course.',
      answer: 'enrol',
    },
  },
];

export const INITIAL_STUDY_STATE: StudyState = {
  xp: 0,
  currentStreak: 0,
  bestStreak: 0,
  weeklyActivity: [false, false, false, false, false, false, false],
  wordMastery: {},
  skills: { speaking: 0, writing: 0, reading: 0, listening: 0 },
};
