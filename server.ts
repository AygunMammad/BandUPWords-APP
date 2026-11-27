import 'dotenv/config';
import crypto from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildDefaultSectionMedia,
  db,
  getAdminCredential,
  listAllSections,
  saveAdminCredential,
} from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const OWNER_EMAIL = (process.env.ADMIN_EMAIL?.trim() || 'mammadovaaygun33@gmail.com').toLowerCase();
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

function getEnvPasscode(): string {
  return process.env.ADMIN_PASSCODE?.trim() || '';
}

function sha256(input: string): Buffer {
  return crypto.createHash('sha256').update(input).digest();
}

function safeEqualText(a: string, b: string): boolean {
  return crypto.timingSafeEqual(sha256(a), sha256(b));
}

function hashPasswordScrypt(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPasswordScrypt(password: string, salt: string, storedHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHex, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

interface AdminTokenPayload {
  email: string;
  role: 'owner_admin';
  exp: number;
}

function signAdminToken(email: string): string {
  const payload: AdminTokenPayload = {
    email,
    role: 'owner_admin',
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyAdminToken(token: string): AdminTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  if (!safeEqualText(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (
      payload.role !== 'owner_admin' ||
      typeof payload.email !== 'string' ||
      !safeEqualText(payload.email.toLowerCase(), OWNER_EMAIL) ||
      typeof payload.exp !== 'number' ||
      Date.now() > payload.exp
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

const adminAuthAttempts = new Map<string, { count: number; resetAt: number }>();

function checkAdminRateLimit(req: Request, res: Response): boolean {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = adminAuthAttempts.get(key);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) {
      res.status(429).json({
        error: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
      });
      return false;
    }
  } else if (entry && now >= entry.resetAt) {
    adminAuthAttempts.delete(key);
  }
  return true;
}

function recordFailedAdminAttempt(req: Request) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const existing = adminAuthAttempts.get(key);
  if (!existing || now >= existing.resetAt) {
    adminAuthAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  } else {
    existing.count += 1;
  }
}

function clearAdminAttempts(req: Request) {
  adminAuthAttempts.delete(req.ip || 'unknown');
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Administrator authentication required.' });
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Forbidden: Only the website owner administrator can modify vocabulary.' });
  }
  next();
}

function cleanText(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();
app.use(express.json({ limit: '4mb' }));

// --- Single-Administrator Authentication Routes ---

app.get('/api/admin/status', (req, res) => {
  const envPasscodeActive = Boolean(getEnvPasscode());
  const credential = getAdminCredential();
  const token = extractBearerToken(req);
  const authenticated = Boolean(token && verifyAdminToken(token));
  return res.json({
    ownerEmail: OWNER_EMAIL,
    envPasscodeActive,
    isClaimed: Boolean(credential),
    needsFirstRunClaim: !envPasscodeActive && !credential,
    authenticated,
  });
});

app.post('/api/admin/claim', (req, res) => {
  if (!checkAdminRateLimit(req, res)) return;
  const envPasscode = getEnvPasscode();
  const existingCred = getAdminCredential();
  if (envPasscode || existingCred) {
    return res.status(403).json({
      error: 'Administrator credentials are already configured.',
    });
  }

  const email = cleanText(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !safeEqualText(email, OWNER_EMAIL)) {
    recordFailedAdminAttempt(req);
    return res.status(403).json({
      error: `Only the website owner (${OWNER_EMAIL}) can claim administrator access.`,
    });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      error: 'Administrator password must be between 8 and 128 characters.',
    });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPasswordScrypt(password, salt);
  saveAdminCredential(OWNER_EMAIL, hash, salt);
  clearAdminAttempts(req);

  const token = signAdminToken(OWNER_EMAIL);
  return res.status(201).json({
    ok: true,
    email: OWNER_EMAIL,
    token,
  });
});

app.post('/api/admin/login', (req, res) => {
  if (!checkAdminRateLimit(req, res)) return;
  const email = cleanText(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !safeEqualText(email, OWNER_EMAIL)) {
    recordFailedAdminAttempt(req);
    return res.status(403).json({
      error: 'Access denied. Only the website owner administrator can log in here.',
    });
  }

  const envPasscode = getEnvPasscode();
  if (envPasscode) {
    if (!password || !safeEqualText(password, envPasscode)) {
      recordFailedAdminAttempt(req);
      return res.status(401).json({ error: 'Invalid administrator password.' });
    }
    clearAdminAttempts(req);
    const token = signAdminToken(OWNER_EMAIL);
    return res.json({ ok: true, email: OWNER_EMAIL, token });
  }

  const cred = getAdminCredential();
  if (!cred) {
    return res.status(409).json({
      error: 'Administrator password has not been set up yet. Complete the first-run owner setup first.',
    });
  }

  if (!password || !verifyPasswordScrypt(password, cred.salt, cred.password_hash)) {
    recordFailedAdminAttempt(req);
    return res.status(401).json({ error: 'Invalid administrator password.' });
  }

  clearAdminAttempts(req);
  const token = signAdminToken(OWNER_EMAIL);
  return res.json({ ok: true, email: OWNER_EMAIL, token });
});

app.get('/api/admin/verify', requireAdmin, (_req, res) => {
  return res.json({ ok: true, email: OWNER_EMAIL });
});

// --- Public Read-Only Vocabulary Route ---

app.get('/api/sections', (_req, res) => {
  const sections = listAllSections();
  return res.json({ sections });
});

// --- Admin-Only Vocabulary & Section Mutations ---

app.post('/api/sections', requireAdmin, (req, res) => {
  const name = cleanText(req.body?.name, 120);
  if (!name) {
    return res.status(400).json({ error: 'Section name is required.' });
  }
  const accentVariants = ['primary', 'secondary', 'sunny', 'success'] as const;
  const variant = accentVariants.includes(req.body?.accentVariant)
    ? req.body.accentVariant
    : accentVariants[Math.floor(Math.random() * accentVariants.length)];

  const id = `sec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const media = buildDefaultSectionMedia(name, []);

  db.prepare(
    `INSERT INTO sections (id, name, accent_variant, reading_json, listening_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    variant,
    JSON.stringify(media.readingPassage),
    JSON.stringify(media.listeningClip),
    new Date().toISOString()
  );

  return res.status(201).json({ sections: listAllSections(), createdId: id });
});

app.patch('/api/sections/:id', requireAdmin, (req, res) => {
  const id = cleanText(req.params.id, 120);
  const name = cleanText(req.body?.name, 120);
  if (!id || !name) {
    return res.status(400).json({ error: 'Valid section ID and name are required.' });
  }
  const info = db.prepare('UPDATE sections SET name = ? WHERE id = ?').run(name, id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Section not found.' });
  }
  return res.json({ sections: listAllSections() });
});

app.delete('/api/sections/:id', requireAdmin, (req, res) => {
  const id = cleanText(req.params.id, 120);
  const info = db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Section not found.' });
  }
  return res.json({ sections: listAllSections() });
});

app.post('/api/words', requireAdmin, (req, res) => {
  const sectionId = cleanText(req.body?.sectionId, 120);
  const word = cleanText(req.body?.word, 120);
  const azerbaijani = cleanText(req.body?.azerbaijani, 240);
  const definition = cleanText(req.body?.definition, 600);
  const example = cleanText(req.body?.example, 600);
  const type = cleanText(req.body?.type, 40);
  const ieltsLevel = cleanText(req.body?.ieltsLevel, 40);
  const topic = cleanText(req.body?.topic, 80);
  const synonyms = cleanText(req.body?.synonyms, 240);
  const collocation = cleanText(req.body?.collocation, 180);
  const pronunciation = cleanText(req.body?.pronunciation, 120) || `/${word}/`;
  const source = cleanText(req.body?.source, 120) || 'Admin';

  if (!sectionId || !word || !azerbaijani || !definition || !example || !type || !ieltsLevel || !topic) {
    return res.status(400).json({
      error:
        'Required fields: sectionId, English word, Azerbaijani translation, definition, example sentence, part of speech, IELTS level, and topic.',
    });
  }

  const secExists = db.prepare('SELECT id FROM sections WHERE id = ?').get(sectionId);
  if (!secExists) {
    return res.status(404).json({ error: 'Target section does not exist.' });
  }

  const maxRow = db
    .prepare('SELECT COALESCE(MAX(sort_index), 0) AS maxIdx FROM words WHERE section_id = ?')
    .get(sectionId) as { maxIdx: number };

  const id = `w-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  db.prepare(
    `INSERT INTO words (
      id, section_id, sort_index, word, azerbaijani, definition, example,
      part_of_speech, ielts_level, topic, synonyms, collocation, pronunciation, source, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    sectionId,
    maxRow.maxIdx + 1,
    word,
    azerbaijani,
    definition,
    example,
    type,
    ieltsLevel,
    topic,
    synonyms,
    collocation,
    pronunciation,
    source,
    new Date().toISOString()
  );

  return res.status(201).json({ sections: listAllSections(), createdId: id });
});

app.patch('/api/words/:id', requireAdmin, (req, res) => {
  const id = cleanText(req.params.id, 120);
  const existing = db.prepare('SELECT * FROM words WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Vocabulary word not found.' });
  }

  const word = cleanText(req.body?.word, 120);
  const azerbaijani = cleanText(req.body?.azerbaijani, 240);
  const definition = cleanText(req.body?.definition, 600);
  const example = cleanText(req.body?.example, 600);
  const type = cleanText(req.body?.type, 40);
  const ieltsLevel = cleanText(req.body?.ieltsLevel, 40);
  const topic = cleanText(req.body?.topic, 80);
  const synonyms = cleanText(req.body?.synonyms, 240);
  const collocation = cleanText(req.body?.collocation, 180);
  const pronunciation = cleanText(req.body?.pronunciation, 120) || `/${word}/`;
  const sectionId = cleanText(req.body?.sectionId, 120) || String(existing.section_id);

  if (!word || !azerbaijani || !definition || !example || !type || !ieltsLevel || !topic) {
    return res.status(400).json({
      error: 'All 7 core vocabulary fields are required when updating a word.',
    });
  }

  const secExists = db.prepare('SELECT id FROM sections WHERE id = ?').get(sectionId);
  if (!secExists) {
    return res.status(404).json({ error: 'Target section does not exist.' });
  }

  db.prepare(
    `UPDATE words
     SET section_id = ?, word = ?, azerbaijani = ?, definition = ?, example = ?,
         part_of_speech = ?, ielts_level = ?, topic = ?, synonyms = ?, collocation = ?, pronunciation = ?
     WHERE id = ?`
  ).run(
    sectionId,
    word,
    azerbaijani,
    definition,
    example,
    type,
    ieltsLevel,
    topic,
    synonyms,
    collocation,
    pronunciation,
    id
  );

  return res.json({ sections: listAllSections() });
});

app.delete('/api/words/:id', requireAdmin, (req, res) => {
  const id = cleanText(req.params.id, 120);
  const info = db.prepare('DELETE FROM words WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'Vocabulary word not found.' });
  }
  return res.json({ sections: listAllSections() });
});

app.post('/api/words/import', requireAdmin, (req, res) => {
  const targetSectionId = cleanText(req.body?.sectionId, 120);
  const newSectionName = cleanText(req.body?.sectionName, 120);
  const rawWords = Array.isArray(req.body?.words) ? req.body.words : [];

  if (rawWords.length === 0) {
    return res.status(400).json({ error: 'No vocabulary rows provided to import.' });
  }
  if (rawWords.length > 1000) {
    return res.status(400).json({ error: 'Maximum 1,000 rows per bulk import.' });
  }

  interface NormalizedImportWord {
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

  const typedRows = rawWords as Array<Record<string, unknown>>;
  const normalizedWords: NormalizedImportWord[] = typedRows
    .map((item, idx): NormalizedImportWord | null => {
      const word = cleanText(item?.word, 120);
      if (!word) return null;
      return {
        index: Number(item?.index) || idx + 1,
        word,
        azerbaijani: cleanText(item?.azerbaijani, 240) || 'tərcümə',
        definition: cleanText(item?.definition, 600) || `Academic IELTS vocabulary word: ${word}.`,
        example: cleanText(item?.example, 600) || `Researchers highlighted "${word}" in the report.`,
        type: cleanText(item?.type, 40) || 'noun',
        ieltsLevel: cleanText(item?.ieltsLevel, 40) || 'Band 7.0',
        topic: cleanText(item?.topic, 80) || 'Academic',
        synonyms: cleanText(item?.synonyms, 240) || '',
        collocation: cleanText(item?.collocation, 180) || '',
        pronunciation: cleanText(item?.pronunciation, 120) || `/${word}/`,
        source: cleanText(item?.source, 120) || newSectionName || 'Bulk Import',
      };
    })
    .filter((w): w is NormalizedImportWord => w !== null);

  if (normalizedWords.length === 0) {
    return res.status(400).json({ error: 'No valid rows with an English word were found.' });
  }

  let resolvedSectionId = targetSectionId;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    if (!resolvedSectionId) {
      const nameToUse = newSectionName || `Imported_Vocabulary_${Date.now()}`;
      resolvedSectionId = `sec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const media = buildDefaultSectionMedia(nameToUse, normalizedWords);
      const countRow = db.prepare('SELECT COUNT(*) AS count FROM sections').get() as { count: number };
      const variants = ['primary', 'secondary', 'sunny', 'success'] as const;
      const variant = variants[countRow.count % variants.length];

      db.prepare(
        `INSERT INTO sections (id, name, accent_variant, reading_json, listening_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        resolvedSectionId,
        nameToUse,
        variant,
        JSON.stringify(media.readingPassage),
        JSON.stringify(media.listeningClip),
        now
      );
    } else {
      const sec = db.prepare('SELECT id FROM sections WHERE id = ?').get(resolvedSectionId);
      if (!sec) {
        throw new Error('Selected target section was not found.');
      }
    }

    const maxRow = db
      .prepare('SELECT COALESCE(MAX(sort_index), 0) AS maxIdx FROM words WHERE section_id = ?')
      .get(resolvedSectionId) as { maxIdx: number };

    const insertWord = db.prepare(
      `INSERT INTO words (
        id, section_id, sort_index, word, azerbaijani, definition, example,
        part_of_speech, ielts_level, topic, synonyms, collocation, pronunciation, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    normalizedWords.forEach((w, i) => {
      const wId = `w-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`;
      insertWord.run(
        wId,
        resolvedSectionId,
        maxRow.maxIdx + i + 1,
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
    });
  });

  try {
    tx();
    return res.status(201).json({
      ok: true,
      importedCount: normalizedWords.length,
      sectionId: resolvedSectionId,
      sections: listAllSections(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bulk import failed.';
    return res.status(400).json({ error: msg });
  }
});

// --- Writing & Speaking Evaluation via Gemini ---

app.post('/api/evaluate-writing', async (req, res) => {
  const { topic, prompt, targetWords, essayText, miniTasks } = req.body ?? {};
  if (typeof essayText !== 'string' || !essayText.trim()) {
    return res.status(400).json({ error: 'Please write a response before checking your answer.' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured in Secrets. Configure GEMINI_API_KEY to enable live AI writing evaluation.',
    });
  }

  try {
    const wordList = Array.isArray(targetWords) ? targetWords.join(', ') : '';
    const miniSummary = Array.isArray(miniTasks)
      ? miniTasks.map((t: { label?: string; answer?: string }) => `${t.label}: "${t.answer ?? ''}"`).join(' | ')
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Evaluate this IELTS Writing Task 2 practice response.
Topic: ${String(topic ?? 'General')}
Prompt: ${String(prompt ?? '')}
Target Vocabulary Words: ${wordList}
Student Response: """${essayText.trim()}"""
Mini Tasks: ${miniSummary}

Provide concise, encouraging IELTS examiner feedback covering grammar, vocabulary collocations, and task response, plus a short 2-sentence Band 8 model answer using the target words, and brief coaching on one missed/weak target word.`,
      config: {
        systemInstruction:
          'You are an experienced IELTS Writing examiner. Keep feedback crisp, constructive, and grounded in the student text.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: {
              type: Type.STRING,
              description: '2-3 sentences covering grammar, lexical collocation, and task response.',
            },
            needsFix: {
              type: Type.STRING,
              description: '1 short actionable suggestion on a missed or improvable target word.',
            },
            modelAnswer: {
              type: Type.STRING,
              description: 'A natural 2-3 sentence Band 8 example incorporating the target words.',
            },
            miniTaskFeedback: {
              type: Type.STRING,
              description: 'Brief 1-sentence check of the mini tasks.',
            },
          },
          required: ['feedback', 'needsFix', 'modelAnswer', 'miniTaskFeedback'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to evaluate writing with Gemini API.';
    return res.status(502).json({ error: message });
  }
});

app.post('/api/evaluate-speaking', async (req, res) => {
  const { part, prompt, targetWords, transcript } = req.body ?? {};
  if (typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'Record or enter your spoken transcript first.' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured in Secrets. Configure GEMINI_API_KEY to enable live AI speaking evaluation.',
    });
  }

  try {
    const wordList = Array.isArray(targetWords) ? targetWords.join(', ') : '';
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Evaluate this IELTS Speaking ${String(part ?? 'Part 2')} transcript.
Prompt: ${String(prompt ?? '')}
Target Vocabulary Words: ${wordList}
Student Transcript: """${transcript.trim()}"""

Provide concise IELTS Speaking feedback on fluency, lexical resource, and natural phrasing, plus a natural 2-3 sentence Band 8 model answer using the target words.`,
      config: {
        systemInstruction:
          'You are an experienced IELTS Speaking examiner. Be concise, supportive, and specific to the student transcript.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            feedback: {
              type: Type.STRING,
              description: '2-3 sentences of constructive IELTS Speaking feedback.',
            },
            modelAnswer: {
              type: Type.STRING,
              description: 'A natural 2-3 sentence Band 8 spoken response using the target words.',
            },
          },
          required: ['feedback', 'modelAnswer'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to evaluate speaking with Gemini API.';
    return res.status(502).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BandUp Words server running at http://localhost:${PORT}`);
  });
}

startServer();
