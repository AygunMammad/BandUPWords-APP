import { createClient, type Client, type InStatement } from '@libsql/client';
import crypto from 'crypto';
import { SEED_SECTIONS } from '../src/data/seedVocabulary.js';
import type { VocabSection, VocabWord } from '../src/types.js';

export interface AdminCredentialRow {
  id: number;
  email: string;
  password_hash: string;
  salt: string;
  claimed_at: string;
}

export interface NormalizedImportWord {
  index: number;
  word: string;
  azerbaijani: string;
  definition: string;
  example: string;
  type: string;
  ieltsLevel: string;
  topic: string;
  synonyms: string;
  collocation: string;
  pronunciation: string;
  source: string;
}

interface SectionRow {
  id: string;
  name: string;
  accent_variant: VocabSection['accentVariant'];
  reading_json: string;
  listening_json: string;
  created_at: string;
}

interface WordRow {
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
  created_at: string;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

function getTursoConfig(): { url: string; authToken?: string } | null {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!url) {
    if (isProductionRuntime()) {
      throw new Error(
        'Database configuration error: TURSO_DATABASE_URL is not configured in environment variables.'
      );
    }
    return null;
  }

  return authToken ? { url, authToken } : { url };
}

let tursoClient: Client | null = null;
let initPromise: Promise<void> | null = null;

function getTursoClient(): Client | null {
  if (tursoClient) return tursoClient;
  const cfg = getTursoConfig();
  if (!cfg) return null;
  tursoClient = createClient(cfg);
  return tursoClient;
}

// Local development fallback store (only used when TURSO_DATABASE_URL is unset outside production)
let memoryAdminCredential: AdminCredentialRow | undefined;
const memorySections: SectionRow[] = [];
const memoryWords: WordRow[] = [];
let memorySeeded = false;

function ensureMemorySeeded() {
  if (memorySeeded) return;
  memorySeeded = true;
  if (memorySections.length > 0) return;

  const now = new Date().toISOString();
  for (const sec of SEED_SECTIONS) {
    memorySections.push({
      id: sec.id,
      name: sec.name,
      accent_variant: sec.accentVariant,
      reading_json: JSON.stringify(sec.readingPassage),
      listening_json: JSON.stringify(sec.listeningClip),
      created_at: now,
    });
    for (const w of sec.words) {
      memoryWords.push({
        id: w.id,
        section_id: sec.id,
        sort_index: w.index,
        word: w.word,
        azerbaijani: w.azerbaijani,
        definition: w.definition,
        example: w.example,
        part_of_speech: w.type,
        ielts_level: w.ieltsLevel,
        topic: w.topic,
        synonyms: w.synonyms,
        collocation: w.collocation,
        pronunciation: w.pronunciation,
        source: w.source,
        created_at: now,
      });
    }
  }
}

async function ensureInitialized(): Promise<Client | null> {
  const client = getTursoClient();
  if (!client) {
    ensureMemorySeeded();
    return null;
  }

  if (!initPromise) {
    initPromise = (async () => {
      // Non-destructive initialization: only create tables if absent; never alter or overwrite existing data.
      await client.batch(
        [
          `CREATE TABLE IF NOT EXISTS admin_credentials (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            claimed_at TEXT NOT NULL
          )`,
          `CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            accent_variant TEXT NOT NULL DEFAULT 'primary',
            reading_json TEXT NOT NULL,
            listening_json TEXT NOT NULL,
            created_at TEXT NOT NULL
          )`,
          `CREATE TABLE IF NOT EXISTS words (
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
          )`,
        ],
        'write'
      );

      // Seed default vocabulary ONLY when sections table is completely empty.
      const countRes = await client.execute('SELECT COUNT(*) AS count FROM sections');
      const count = Number(countRes.rows[0]?.count ?? 0);
      if (count === 0) {
        const now = new Date().toISOString();
        const seedStatements: InStatement[] = [];
        for (const sec of SEED_SECTIONS) {
          seedStatements.push({
            sql: `INSERT OR IGNORE INTO sections (id, name, accent_variant, reading_json, listening_json, created_at)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              sec.id,
              sec.name,
              sec.accentVariant,
              JSON.stringify(sec.readingPassage),
              JSON.stringify(sec.listeningClip),
              now,
            ],
          });
          for (const w of sec.words) {
            seedStatements.push({
              sql: `INSERT OR IGNORE INTO words (
                      id, section_id, sort_index, word, azerbaijani, definition, example,
                      part_of_speech, ielts_level, topic, synonyms, collocation, pronunciation, source, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
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
                now,
              ],
            });
          }
        }
        if (seedStatements.length > 0) {
          await client.batch(seedStatements, 'write');
        }
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  await initPromise;
  return client;
}

export async function getAdminCredential(): Promise<AdminCredentialRow | undefined> {
  const client = await ensureInitialized();
  if (!client) {
    return memoryAdminCredential;
  }

  const res = await client.execute('SELECT * FROM admin_credentials WHERE id = 1 LIMIT 1');
  const row = res.rows[0];
  if (!row) return undefined;

  return {
    id: Number(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    salt: String(row.salt),
    claimed_at: String(row.claimed_at),
  };
}

export async function saveAdminCredential(
  email: string,
  passwordHash: string,
  salt: string
): Promise<void> {
  const claimedAt = new Date().toISOString();
  const client = await ensureInitialized();
  if (!client) {
    if (memoryAdminCredential) {
      throw new Error('Administrator credentials are already configured.');
    }
    memoryAdminCredential = {
      id: 1,
      email,
      password_hash: passwordHash,
      salt,
      claimed_at: claimedAt,
    };
    return;
  }

  await client.execute({
    sql: `INSERT INTO admin_credentials (id, email, password_hash, salt, claimed_at)
          VALUES (1, ?, ?, ?, ?)`,
    args: [email, passwordHash, salt, claimedAt],
  });
}

export async function listAllSections(): Promise<VocabSection[]> {
  const client = await ensureInitialized();
  if (!client) {
    return memorySections.map((s) => {
      const wordRows = memoryWords
        .filter((w) => w.section_id === s.id)
        .sort((a, b) => a.sort_index - b.sort_index);

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

  const [secRes, wordRes] = await Promise.all([
    client.execute('SELECT * FROM sections ORDER BY rowid ASC'),
    client.execute('SELECT * FROM words ORDER BY sort_index ASC, rowid ASC'),
  ]);

  const wordsBySection = new Map<string, VocabWord[]>();
  for (const w of wordRes.rows) {
    const sectionId = String(w.section_id);
    const list = wordsBySection.get(sectionId) ?? [];
    list.push({
      id: String(w.id),
      sectionId,
      index: Number(w.sort_index ?? 1),
      word: String(w.word),
      azerbaijani: String(w.azerbaijani),
      definition: String(w.definition),
      example: String(w.example),
      type: String(w.part_of_speech),
      ieltsLevel: String(w.ielts_level),
      topic: String(w.topic),
      synonyms: String(w.synonyms ?? ''),
      collocation: String(w.collocation ?? ''),
      pronunciation: String(w.pronunciation ?? ''),
      source: String(w.source ?? ''),
    });
    wordsBySection.set(sectionId, list);
  }

  return secRes.rows.map((s) => {
    const id = String(s.id);
    return {
      id,
      name: String(s.name),
      accentVariant: (String(s.accent_variant || 'primary') as VocabSection['accentVariant']),
      words: wordsBySection.get(id) ?? [],
      readingPassage: JSON.parse(String(s.reading_json)),
      listeningClip: JSON.parse(String(s.listening_json)),
    };
  });
}

export async function createSection(input: {
  name: string;
  accentVariant: VocabSection['accentVariant'];
}): Promise<string> {
  const id = `sec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const media = buildDefaultSectionMedia(input.name, []);
  const now = new Date().toISOString();
  const readingJson = JSON.stringify(media.readingPassage);
  const listeningJson = JSON.stringify(media.listeningClip);

  const client = await ensureInitialized();
  if (!client) {
    memorySections.push({
      id,
      name: input.name,
      accent_variant: input.accentVariant,
      reading_json: readingJson,
      listening_json: listeningJson,
      created_at: now,
    });
    return id;
  }

  await client.execute({
    sql: `INSERT INTO sections (id, name, accent_variant, reading_json, listening_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, input.name, input.accentVariant, readingJson, listeningJson, now],
  });
  return id;
}

export async function renameSection(id: string, name: string): Promise<boolean> {
  const client = await ensureInitialized();
  if (!client) {
    const sec = memorySections.find((s) => s.id === id);
    if (!sec) return false;
    sec.name = name;
    return true;
  }

  const res = await client.execute({
    sql: 'UPDATE sections SET name = ? WHERE id = ?',
    args: [name, id],
  });
  return res.rowsAffected > 0;
}

export async function deleteSection(id: string): Promise<boolean> {
  const client = await ensureInitialized();
  if (!client) {
    const idx = memorySections.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    memorySections.splice(idx, 1);
    for (let i = memoryWords.length - 1; i >= 0; i--) {
      if (memoryWords[i].section_id === id) {
        memoryWords.splice(i, 1);
      }
    }
    return true;
  }

  const existing = await client.execute({
    sql: 'SELECT id FROM sections WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (existing.rows.length === 0) return false;

  await client.batch(
    [
      { sql: 'DELETE FROM words WHERE section_id = ?', args: [id] },
      { sql: 'DELETE FROM sections WHERE id = ?', args: [id] },
    ],
    'write'
  );
  return true;
}

export async function createWord(input: {
  sectionId: string;
  word: string;
  azerbaijani: string;
  definition: string;
  example: string;
  type: string;
  ieltsLevel: string;
  topic: string;
  synonyms: string;
  collocation: string;
  pronunciation: string;
  source: string;
}): Promise<{ status: 'ok'; id: string } | { status: 'section_not_found' }> {
  const id = `w-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const client = await ensureInitialized();

  if (!client) {
    const secExists = memorySections.some((s) => s.id === input.sectionId);
    if (!secExists) return { status: 'section_not_found' };
    const maxIdx = memoryWords
      .filter((w) => w.section_id === input.sectionId)
      .reduce((max, w) => Math.max(max, w.sort_index), 0);

    memoryWords.push({
      id,
      section_id: input.sectionId,
      sort_index: maxIdx + 1,
      word: input.word,
      azerbaijani: input.azerbaijani,
      definition: input.definition,
      example: input.example,
      part_of_speech: input.type,
      ielts_level: input.ieltsLevel,
      topic: input.topic,
      synonyms: input.synonyms,
      collocation: input.collocation,
      pronunciation: input.pronunciation,
      source: input.source,
      created_at: now,
    });
    return { status: 'ok', id };
  }

  const secRes = await client.execute({
    sql: 'SELECT id FROM sections WHERE id = ? LIMIT 1',
    args: [input.sectionId],
  });
  if (secRes.rows.length === 0) {
    return { status: 'section_not_found' };
  }

  const maxRes = await client.execute({
    sql: 'SELECT COALESCE(MAX(sort_index), 0) AS maxIdx FROM words WHERE section_id = ?',
    args: [input.sectionId],
  });
  const maxIdx = Number(maxRes.rows[0]?.maxIdx ?? 0);

  await client.execute({
    sql: `INSERT INTO words (
      id, section_id, sort_index, word, azerbaijani, definition, example,
      part_of_speech, ielts_level, topic, synonyms, collocation, pronunciation, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.sectionId,
      maxIdx + 1,
      input.word,
      input.azerbaijani,
      input.definition,
      input.example,
      input.type,
      input.ieltsLevel,
      input.topic,
      input.synonyms,
      input.collocation,
      input.pronunciation,
      input.source,
      now,
    ],
  });

  return { status: 'ok', id };
}

export async function updateWord(
  id: string,
  input: {
    sectionId?: string;
    word: string;
    azerbaijani: string;
    definition: string;
    example: string;
    type: string;
    ieltsLevel: string;
    topic: string;
    synonyms: string;
    collocation: string;
    pronunciation: string;
  }
): Promise<'ok' | 'word_not_found' | 'section_not_found'> {
  const client = await ensureInitialized();

  if (!client) {
    const target = memoryWords.find((w) => w.id === id);
    if (!target) return 'word_not_found';
    const nextSectionId = input.sectionId || target.section_id;
    if (!memorySections.some((s) => s.id === nextSectionId)) {
      return 'section_not_found';
    }
    target.section_id = nextSectionId;
    target.word = input.word;
    target.azerbaijani = input.azerbaijani;
    target.definition = input.definition;
    target.example = input.example;
    target.part_of_speech = input.type;
    target.ielts_level = input.ieltsLevel;
    target.topic = input.topic;
    target.synonyms = input.synonyms;
    target.collocation = input.collocation;
    target.pronunciation = input.pronunciation;
    return 'ok';
  }

  const existingRes = await client.execute({
    sql: 'SELECT section_id FROM words WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (existingRes.rows.length === 0) {
    return 'word_not_found';
  }

  const resolvedSectionId = input.sectionId || String(existingRes.rows[0].section_id);
  const secRes = await client.execute({
    sql: 'SELECT id FROM sections WHERE id = ? LIMIT 1',
    args: [resolvedSectionId],
  });
  if (secRes.rows.length === 0) {
    return 'section_not_found';
  }

  await client.execute({
    sql: `UPDATE words
          SET section_id = ?, word = ?, azerbaijani = ?, definition = ?, example = ?,
              part_of_speech = ?, ielts_level = ?, topic = ?, synonyms = ?, collocation = ?, pronunciation = ?
          WHERE id = ?`,
    args: [
      resolvedSectionId,
      input.word,
      input.azerbaijani,
      input.definition,
      input.example,
      input.type,
      input.ieltsLevel,
      input.topic,
      input.synonyms,
      input.collocation,
      input.pronunciation,
      id,
    ],
  });

  return 'ok';
}

export async function deleteWord(id: string): Promise<boolean> {
  const client = await ensureInitialized();
  if (!client) {
    const idx = memoryWords.findIndex((w) => w.id === id);
    if (idx === -1) return false;
    memoryWords.splice(idx, 1);
    return true;
  }

  const res = await client.execute({
    sql: 'DELETE FROM words WHERE id = ?',
    args: [id],
  });
  return res.rowsAffected > 0;
}

export async function importWordsBatch(input: {
  targetSectionId: string;
  newSectionName: string;
  words: NormalizedImportWord[];
}): Promise<{ sectionId: string; importedCount: number }> {
  const now = new Date().toISOString();
  const variants = ['primary', 'secondary', 'sunny', 'success'] as const;
  const client = await ensureInitialized();

  if (!client) {
    let resolvedSectionId = input.targetSectionId;
    if (!resolvedSectionId) {
      const nameToUse = input.newSectionName || `Imported_Vocabulary_${Date.now()}`;
      resolvedSectionId = `sec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const media = buildDefaultSectionMedia(nameToUse, input.words);
      const variant = variants[memorySections.length % variants.length];
      memorySections.push({
        id: resolvedSectionId,
        name: nameToUse,
        accent_variant: variant,
        reading_json: JSON.stringify(media.readingPassage),
        listening_json: JSON.stringify(media.listeningClip),
        created_at: now,
      });
    } else if (!memorySections.some((s) => s.id === resolvedSectionId)) {
      throw new Error('Selected target section was not found.');
    }

    const maxIdx = memoryWords
      .filter((w) => w.section_id === resolvedSectionId)
      .reduce((max, w) => Math.max(max, w.sort_index), 0);

    input.words.forEach((w, i) => {
      const wId = `w-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`;
      memoryWords.push({
        id: wId,
        section_id: resolvedSectionId,
        sort_index: maxIdx + i + 1,
        word: w.word,
        azerbaijani: w.azerbaijani,
        definition: w.definition,
        example: w.example,
        part_of_speech: w.type,
        ielts_level: w.ieltsLevel,
        topic: w.topic,
        synonyms: w.synonyms,
        collocation: w.collocation,
        pronunciation: w.pronunciation,
        source: w.source,
        created_at: now,
      });
    });

    return { sectionId: resolvedSectionId, importedCount: input.words.length };
  }

  const statements: InStatement[] = [];
  let resolvedSectionId = input.targetSectionId;
  let startIndex = 0;

  if (!resolvedSectionId) {
    const nameToUse = input.newSectionName || `Imported_Vocabulary_${Date.now()}`;
    resolvedSectionId = `sec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const media = buildDefaultSectionMedia(nameToUse, input.words);
    const countRes = await client.execute('SELECT COUNT(*) AS count FROM sections');
    const secCount = Number(countRes.rows[0]?.count ?? 0);
    const variant = variants[secCount % variants.length];

    statements.push({
      sql: `INSERT INTO sections (id, name, accent_variant, reading_json, listening_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        resolvedSectionId,
        nameToUse,
        variant,
        JSON.stringify(media.readingPassage),
        JSON.stringify(media.listeningClip),
        now,
      ],
    });
  } else {
    const secRes = await client.execute({
      sql: 'SELECT id FROM sections WHERE id = ? LIMIT 1',
      args: [resolvedSectionId],
    });
    if (secRes.rows.length === 0) {
      throw new Error('Selected target section was not found.');
    }
    const maxRes = await client.execute({
      sql: 'SELECT COALESCE(MAX(sort_index), 0) AS maxIdx FROM words WHERE section_id = ?',
      args: [resolvedSectionId],
    });
    startIndex = Number(maxRes.rows[0]?.maxIdx ?? 0);
  }

  input.words.forEach((w, i) => {
    const wId = `w-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`;
    statements.push({
      sql: `INSERT INTO words (
        id, section_id, sort_index, word, azerbaijani, definition, example,
        part_of_speech, ielts_level, topic, synonyms, collocation, pronunciation, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        wId,
        resolvedSectionId,
        startIndex + i + 1,
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
        now,
      ],
    });
  });

  await client.batch(statements, 'write');
  return { sectionId: resolvedSectionId, importedCount: input.words.length };
}

export function buildDefaultSectionMedia(
  sectionName: string,
  words: Array<{ word: string; definition: string; example: string }>
) {
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
