import type { User } from '@supabase/supabase-js';
import { INITIAL_STUDY_STATE, SEED_SECTIONS } from '../data/seedVocabulary';
import type {
  LeaderboardEntry,
  StudyState,
  UserProfile,
  VocabSection,
  VocabWord,
} from '../types';
import { supabase } from './supabase';

function parseGoogleUserNames(authUser: User): {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
} {
  const meta = authUser.user_metadata || {};
  const fullName: string =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (authUser.email ? authUser.email.split('@')[0] : 'Student');

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Student';
  const lastName = parts.slice(1).join(' ');
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    undefined;

  return { firstName, lastName, avatarUrl };
}

export async function loadOrCreateUserRecord(authUser: User): Promise<{
  profile: UserProfile;
  studyState: StudyState;
}> {
  const fallbackNames = parseGoogleUserNames(authUser);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    const profile: UserProfile = {
      id: authUser.id,
      firstName: data.first_name || fallbackNames.firstName,
      lastName: data.last_name ?? fallbackNames.lastName,
      email: data.email || authUser.email || undefined,
      avatarUrl: data.avatar_url || fallbackNames.avatarUrl,
      targetBand: data.target_band || '7.5',
    };

    const studyState: StudyState = {
      xp: typeof data.xp === 'number' ? data.xp : INITIAL_STUDY_STATE.xp,
      currentStreak:
        typeof data.current_streak === 'number'
          ? data.current_streak
          : INITIAL_STUDY_STATE.currentStreak,
      bestStreak:
        typeof data.best_streak === 'number'
          ? data.best_streak
          : INITIAL_STUDY_STATE.bestStreak,
      weeklyActivity: Array.isArray(data.weekly_activity)
        ? data.weekly_activity
        : INITIAL_STUDY_STATE.weeklyActivity,
      wordMastery:
        data.word_mastery && typeof data.word_mastery === 'object'
          ? data.word_mastery
          : INITIAL_STUDY_STATE.wordMastery,
      skills:
        data.skills && typeof data.skills === 'object'
          ? {
              speaking: Number(data.skills.speaking ?? 0),
              writing: Number(data.skills.writing ?? 0),
              reading: Number(data.skills.reading ?? 0),
              listening: Number(data.skills.listening ?? 0),
            }
          : INITIAL_STUDY_STATE.skills,
    };

    return { profile, studyState };
  }

  // Create profile & leaderboard entry if not yet created by trigger
  const newProfile: UserProfile = {
    id: authUser.id,
    firstName: fallbackNames.firstName,
    lastName: fallbackNames.lastName,
    email: authUser.email || undefined,
    avatarUrl: fallbackNames.avatarUrl,
    targetBand: '7.5',
  };

  await saveUserRecord(authUser.id, newProfile, INITIAL_STUDY_STATE);
  return { profile: newProfile, studyState: INITIAL_STUDY_STATE };
}

export async function saveUserRecord(
  userId: string,
  profile: UserProfile,
  studyState: StudyState
): Promise<void> {
  const now = new Date().toISOString();
  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Student';

  const { error: profileErr } = await supabase.from('profiles').upsert(
    {
      id: userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      avatar_url: profile.avatarUrl ?? null,
      email: profile.email ?? null,
      target_band: profile.targetBand,
      xp: studyState.xp,
      current_streak: studyState.currentStreak,
      best_streak: studyState.bestStreak,
      weekly_activity: studyState.weeklyActivity,
      word_mastery: studyState.wordMastery,
      skills: studyState.skills,
      updated_at: now,
    },
    { onConflict: 'id' }
  );

  if (profileErr) {
    throw profileErr;
  }

  const { error: lbErr } = await supabase.from('leaderboard_entries').upsert(
    {
      id: userId,
      display_name: displayName,
      avatar_url: profile.avatarUrl ?? null,
      target_band: profile.targetBand,
      xp: studyState.xp,
      current_streak: studyState.currentStreak,
      best_streak: studyState.bestStreak,
      updated_at: now,
    },
    { onConflict: 'id' }
  );

  if (lbErr) {
    throw lbErr;
  }
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('id, display_name, avatar_url, target_band, xp, current_streak, best_streak')
    .order('xp', { ascending: false })
    .order('current_streak', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name || 'Student',
    avatarUrl: row.avatar_url ?? null,
    targetBand: row.target_band || '7.5',
    xp: Number(row.xp ?? 0),
    currentStreak: Number(row.current_streak ?? 1),
    bestStreak: Number(row.best_streak ?? 1),
  }));
}

export async function fetchSectionsFromSupabase(): Promise<VocabSection[] | null> {
  const { data: sectionRows, error: secErr } = await supabase
    .from('sections')
    .select('*')
    .order('created_at', { ascending: true });

  if (secErr || !sectionRows || sectionRows.length === 0) {
    return null;
  }

  const { data: wordRows, error: wordErr } = await supabase
    .from('words')
    .select('*')
    .order('sort_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (wordErr) {
    return null;
  }

  const wordsBySection = new Map<string, VocabWord[]>();
  for (const w of wordRows ?? []) {
    const list = wordsBySection.get(w.section_id) ?? [];
    list.push({
      id: w.id,
      sectionId: w.section_id,
      index: Number(w.sort_index ?? list.length + 1),
      word: w.word,
      synonyms: w.synonyms ?? '',
      azerbaijani: w.azerbaijani ?? '',
      collocation: w.collocation ?? '',
      type: w.part_of_speech ?? '',
      pronunciation: w.pronunciation ?? '',
      definition: w.definition ?? '',
      example: w.example ?? '',
      source: w.source ?? '',
      ieltsLevel: w.ielts_level ?? 'Band 7.0',
      topic: w.topic ?? 'General',
    });
    wordsBySection.set(w.section_id, list);
  }

  const fallbackReading = SEED_SECTIONS[0].readingPassage;
  const fallbackListening = SEED_SECTIONS[0].listeningClip;

  return sectionRows.map((sec) => ({
    id: sec.id,
    name: sec.name,
    accentVariant: sec.accent_variant || 'primary',
    words: wordsBySection.get(sec.id) ?? [],
    readingPassage:
      typeof sec.reading_json === 'string'
        ? JSON.parse(sec.reading_json)
        : sec.reading_json || fallbackReading,
    listeningClip:
      typeof sec.listening_json === 'string'
        ? JSON.parse(sec.listening_json)
        : sec.listening_json || fallbackListening,
  }));
}

export const OWNER_ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL?.trim() || 'mammadovaaygun33@gmail.com'
).toLowerCase();

export async function ensureSectionsSeededInSupabase(): Promise<VocabSection[]> {
  const existing = await fetchSectionsFromSupabase();
  if (existing && existing.length > 0) {
    return existing;
  }

  for (const sec of SEED_SECTIONS) {
    const { error: secErr } = await supabase.from('sections').upsert(
      {
        id: sec.id,
        name: sec.name,
        accent_variant: sec.accentVariant,
        reading_json: sec.readingPassage,
        listening_json: sec.listeningClip,
      },
      { onConflict: 'id' }
    );
    if (secErr) throw secErr;

    if (sec.words.length > 0) {
      const wordPayloads = sec.words.map((w) => ({
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
      }));
      const { error: wordErr } = await supabase
        .from('words')
        .upsert(wordPayloads, { onConflict: 'id' });
      if (wordErr) throw wordErr;
    }
  }

  return (await fetchSectionsFromSupabase()) ?? SEED_SECTIONS;
}

function makeSlugId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${slug || 'item'}_${rand}`;
}

export async function adminCreateSection(name: string): Promise<VocabSection[]> {
  await ensureSectionsSeededInSupabase();
  const id = makeSlugId('sec', name);
  const { error } = await supabase.from('sections').insert({
    id,
    name: name.trim(),
    accent_variant: 'primary',
    reading_json: SEED_SECTIONS[0].readingPassage,
    listening_json: SEED_SECTIONS[0].listeningClip,
  });
  if (error) throw error;
  return (await fetchSectionsFromSupabase()) ?? [];
}

export async function adminRenameSection(
  sectionId: string,
  name: string
): Promise<VocabSection[]> {
  const { error } = await supabase
    .from('sections')
    .update({ name: name.trim() })
    .eq('id', sectionId);
  if (error) throw error;
  return (await fetchSectionsFromSupabase()) ?? [];
}

export async function adminDeleteSection(sectionId: string): Promise<VocabSection[]> {
  const { error } = await supabase.from('sections').delete().eq('id', sectionId);
  if (error) throw error;
  return (await fetchSectionsFromSupabase()) ?? [];
}

export interface AdminWordInput {
  sectionId: string;
  word: string;
  azerbaijani: string;
  definition: string;
  example: string;
  type: string;
  ieltsLevel: string;
  topic: string;
  pronunciation?: string;
  collocation?: string;
  synonyms?: string;
}

export async function adminCreateWord(input: AdminWordInput): Promise<VocabSection[]> {
  await ensureSectionsSeededInSupabase();
  const { count } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', input.sectionId);

  const id = makeSlugId('w', input.word);
  const { error } = await supabase.from('words').insert({
    id,
    section_id: input.sectionId,
    sort_index: (count ?? 0) + 1,
    word: input.word.trim(),
    azerbaijani: input.azerbaijani.trim(),
    definition: input.definition.trim(),
    example: input.example.trim(),
    part_of_speech: input.type.trim() || 'noun',
    ielts_level: input.ieltsLevel.trim() || 'Band 7.0',
    topic: input.topic.trim() || 'Academic',
    pronunciation: (input.pronunciation ?? '').trim(),
    collocation: (input.collocation ?? '').trim(),
    synonyms: (input.synonyms ?? '').trim(),
    source: 'Admin Portal',
  });
  if (error) throw error;
  return (await fetchSectionsFromSupabase()) ?? [];
}

export async function adminUpdateWord(
  wordId: string,
  input: AdminWordInput
): Promise<VocabSection[]> {
  const { error } = await supabase
    .from('words')
    .update({
      section_id: input.sectionId,
      word: input.word.trim(),
      azerbaijani: input.azerbaijani.trim(),
      definition: input.definition.trim(),
      example: input.example.trim(),
      part_of_speech: input.type.trim() || 'noun',
      ielts_level: input.ieltsLevel.trim() || 'Band 7.0',
      topic: input.topic.trim() || 'Academic',
      pronunciation: (input.pronunciation ?? '').trim(),
      collocation: (input.collocation ?? '').trim(),
      synonyms: (input.synonyms ?? '').trim(),
    })
    .eq('id', wordId);
  if (error) throw error;
  return (await fetchSectionsFromSupabase()) ?? [];
}

export async function adminDeleteWord(wordId: string): Promise<VocabSection[]> {
  const { error } = await supabase.from('words').delete().eq('id', wordId);
  if (error) throw error;
  return (await fetchSectionsFromSupabase()) ?? [];
}

export interface ImportedWordRow {
  word: string;
  azerbaijani: string;
  definition: string;
  example: string;
  type: string;
  ieltsLevel: string;
  topic: string;
  synonyms?: string;
  collocation?: string;
  pronunciation?: string;
}

export async function adminImportWordsBatch(params: {
  sectionId?: string;
  sectionName?: string;
  words: ImportedWordRow[];
}): Promise<{ sections: VocabSection[]; importedCount: number }> {
  await ensureSectionsSeededInSupabase();
  let targetSectionId = params.sectionId;

  if (!targetSectionId) {
    const newName = (params.sectionName || 'Imported_Vocabulary').trim();
    targetSectionId = makeSlugId('sec', newName);
    const { error: secErr } = await supabase.from('sections').insert({
      id: targetSectionId,
      name: newName,
      accent_variant: 'primary',
      reading_json: SEED_SECTIONS[0].readingPassage,
      listening_json: SEED_SECTIONS[0].listeningClip,
    });
    if (secErr) throw secErr;
  }

  const { count } = await supabase
    .from('words')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', targetSectionId);

  let nextIdx = (count ?? 0) + 1;
  const rows = params.words.map((w) => ({
    id: makeSlugId('w', w.word),
    section_id: targetSectionId!,
    sort_index: nextIdx++,
    word: w.word.trim(),
    azerbaijani: w.azerbaijani.trim(),
    definition: w.definition.trim(),
    example: w.example.trim(),
    part_of_speech: (w.type || 'noun').trim(),
    ielts_level: (w.ieltsLevel || 'Band 7.0').trim(),
    topic: (w.topic || 'Academic').trim(),
    synonyms: (w.synonyms || '').trim(),
    collocation: (w.collocation || '').trim(),
    pronunciation: (w.pronunciation || '').trim(),
    source: 'Excel Import',
  }));

  const { error } = await supabase.from('words').insert(rows);
  if (error) throw error;

  const sections = (await fetchSectionsFromSupabase()) ?? [];
  return { sections, importedCount: rows.length };
}
