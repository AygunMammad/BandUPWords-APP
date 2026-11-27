import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_SECTIONS } from '../src/data/seedVocabulary.ts';
import type { VocabSection, VocabWord } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'bandup.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_credentials (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    claimed_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    accent_variant TEXT NOT NULL DEFAULT 'primary',
    reading_json TEXT NOT NULL,
    listening_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    sort_index INTEGER NOT NULL DEFAULT 1,
    word TEXT NOT NULL,
    azerbaijani TEXT NOT NULL,
    definition TEXT NOT NULL,
    example TEXT NOT NULL,
    part_of_speech TEXT NOT NULL,
    ielts_level TEXT NOT NULL,
    topic TEXT NOT NULL,
    synonyms TEXT NOT NULL DEFAULT '',
    collocation TEXT NOT NULL DEFAULT '',
    pronunciation TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
  );
`);

function seedIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM sections').get() as { count: number };
  if (row.count > 0) return;

  const insertSection = db.prepare(`
    INSERT INTO sections (id, name, accent_variant, reading_json, listening_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertWord = db.prepare(`
    INSERT INTO words (
      id, section_id, sort_index, word, azerbaijani, definition, example,
      part_of_speech, ielts_level, topic, synonyms, collocation, pronunciation, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const sec of SEED_SECTIONS) {
      insertSection.run(
        sec.id,
        sec.name,
        sec.accentVariant,
        JSON.stringify(sec.readingPassage),
        JSON.stringify(sec.listeningClip),
        now
      );
      for (const w of sec.words) {
        insertWord.run(
          w.id,
          sec.id,
          w.index,
          w.word,
          w.azerbaijani,
          w.definition,
          w.example,
          w.type,
          w.ieltsLevel,
          w.topic,
          w.synonyms,
          w.collocation,
          w.pronunciation,
          w.source,
          now
        );
      }
    }
  });
  tx();
}

seedIfEmpty();

export interface AdminCredentialRow {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  claimed_at: string;
}

export function getAdminCredential(): AdminCredentialRow | undefined {
  return db.prepare('SELECT * FROM admin_credentials WHERE id = 1').get() as
    | AdminCredentialRow
    | undefined;
}

export function saveAdminCredential(email: string, passwordHash: string, salt: string) {
  db.prepare(
    `INSERT INTO admin_credentials (id, email, password_hash, salt, claimed_at)
     VALUES (1, ?, ?, ?, ?)`
  ).run(email, passwordHash, salt, new Date().toISOString());
}

export function listAllSections(): VocabSection[] {
  const secRows = db
    .prepare('SELECT * FROM sections ORDER BY rowid ASC')
    .all() as Array<{
    id: string;
    name: string;
    accent_variant: VocabSection['accentVariant'];
    reading_json: string;
    listening_json: string;
  }>;

  const wordStmt = db.prepare(
    'SELECT * FROM words WHERE section_id = ? ORDER BY sort_index ASC, rowid ASC'
  );

  return secRows.map((s) => {
    const wordRows = wordStmt.all(s.id) as Array<{
      id: string;
      section_id: string;
      sort_index: number;
      word: string;
      azerbaijani: string;
      definition: string;
      example: string;
      part_of_speech: string;
      ielts_level: string;
      topic: string;
      synonyms: string;
      collocation: string;
      pronunciation: string;
      source: string;
    }>;

    const words: VocabWord[] = wordRows.map((w) => ({
      id: w.id,
      sectionId: w.section_id,
      index: w.sort_index,
      word: w.word,
      azerbaijani: w.azerbaijani,
      definition: w.definition,
      example: w.example,
      type: w.part_of_speech,
      ieltsLevel: w.ielts_level,
      topic: w.topic,
      synonyms: w.synonyms,
      collocation: w.collocation,
      pronunciation: w.pronunciation,
      source: w.source,
    }));

    return {
      id: s.id,
      name: s.name,
      accentVariant: s.accent_variant,
      words,
      readingPassage: JSON.parse(s.reading_json),
      listeningClip: JSON.parse(s.listening_json),
    };
  });
}

export function buildDefaultSectionMedia(sectionName: string, words: Array<{ word: string; definition: string; example: string }>) {
  const firstWord = words[0]?.word || 'academic';
  const firstDef = words[0]?.definition || 'Core IELTS academic vocabulary.';
  const passageText =
    words.length > 0
      ? words.slice(0, 6).map((w) => w.example).join(' ')
      : `Academic vocabulary in ${sectionName} strengthens reading and writing precision.`;
  return {
    readingPassage: {
      title: `Academic Passage · ${sectionName}`,
      text: passageText,
      tfngQuestion: {
        statement: `The term "${firstWord}" is featured in this academic passage.`,
        answer: 'True' as const,
        explanation: `The passage includes "${firstWord}" in an academic context.`,
      },
      blankQuestion: {
        sentenceBefore: 'Focus on the key term:',
        sentenceAfter: 'is used in this section.',
        answer: firstWord,
        explanation: firstDef,
      },
    },
    listeningClip: {
      sectionLabel: 'IELTS Listening · Academic Extract',
      title: sectionName,
      durationLabel: '1:30',
      transcript:
        words.length > 0
          ? words.slice(0, 3).map((w) => w.example).join(' ')
          : `Welcome to ${sectionName} academic vocabulary listening practice.`,
      questionBefore: 'Type the key academic word you hear:',
      questionAfter: '',
      answer: firstWord,
    },
  };
}
