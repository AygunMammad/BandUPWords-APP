-- BandUp Words: Complete Supabase Schema & RLS Migration
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qgjjzshaeozdocfobamn/sql/new

-- 1. Private user study state & profile
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  avatar_url text,
  email text,
  target_band text NOT NULL DEFAULT '7.5',
  xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 1,
  best_streak integer NOT NULL DEFAULT 1,
  weekly_activity jsonb NOT NULL DEFAULT '[false,false,false,false,false,true,false]'::jsonb,
  word_mastery jsonb NOT NULL DEFAULT '{}'::jsonb,
  skills jsonb NOT NULL DEFAULT '{"speaking":0,"writing":0,"reading":0,"listening":0}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- 2. Public leaderboard table (excludes email and private study details)
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Student',
  avatar_url text,
  target_band text NOT NULL DEFAULT '7.5',
  xp integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 1,
  best_streak integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_xp_streak
  ON public.leaderboard_entries (xp DESC, current_streak DESC);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Authenticated users can view leaderboard"
  ON public.leaderboard_entries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can insert own leaderboard entry"
  ON public.leaderboard_entries FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON public.leaderboard_entries;
CREATE POLICY "Users can update own leaderboard entry"
  ON public.leaderboard_entries FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- 3. Auto-create profile & leaderboard entry on Google/Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_avatar text;
  v_parts text[];
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, 'Student'), '@', 1)
  );
  v_parts := regexp_split_to_array(trim(v_full_name), '\s+');
  v_first_name := COALESCE(NULLIF(v_parts[1], ''), 'Student');
  v_last_name := COALESCE(NULLIF(array_to_string(v_parts[2:array_length(v_parts, 1)], ' '), ''), '');
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (id, first_name, last_name, avatar_url, email)
  VALUES (NEW.id, v_first_name, v_last_name, v_avatar, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.leaderboard_entries (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    trim(concat_ws(' ', v_first_name, NULLIF(v_last_name, ''))),
    v_avatar
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Vocabulary sections & words + admin credentials
CREATE TABLE IF NOT EXISTS public.sections (
  id text PRIMARY KEY,
  name text NOT NULL,
  accent_variant text NOT NULL DEFAULT 'primary',
  reading_json jsonb NOT NULL,
  listening_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read sections" ON public.sections;
CREATE POLICY "Anyone can read sections"
  ON public.sections FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Owner can insert sections" ON public.sections;
CREATE POLICY "Owner can insert sections"
  ON public.sections FOR INSERT
  TO authenticated
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com');

DROP POLICY IF EXISTS "Owner can update sections" ON public.sections;
CREATE POLICY "Owner can update sections"
  ON public.sections FOR UPDATE
  TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com');

DROP POLICY IF EXISTS "Owner can delete sections" ON public.sections;
CREATE POLICY "Owner can delete sections"
  ON public.sections FOR DELETE
  TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com');

CREATE TABLE IF NOT EXISTS public.words (
  id text PRIMARY KEY,
  section_id text NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  sort_index integer NOT NULL DEFAULT 1,
  word text NOT NULL,
  azerbaijani text NOT NULL,
  definition text NOT NULL,
  example text NOT NULL,
  part_of_speech text NOT NULL,
  ielts_level text NOT NULL,
  topic text NOT NULL,
  synonyms text NOT NULL DEFAULT '',
  collocation text NOT NULL DEFAULT '',
  pronunciation text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_words_section_sort
  ON public.words (section_id, sort_index);

ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read words" ON public.words;
CREATE POLICY "Anyone can read words"
  ON public.words FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Owner can insert words" ON public.words;
CREATE POLICY "Owner can insert words"
  ON public.words FOR INSERT
  TO authenticated
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com');

DROP POLICY IF EXISTS "Owner can update words" ON public.words;
CREATE POLICY "Owner can update words"
  ON public.words FOR UPDATE
  TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com')
  WITH CHECK (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com');

DROP POLICY IF EXISTS "Owner can delete words" ON public.words;
CREATE POLICY "Owner can delete words"
  ON public.words FOR DELETE
  TO authenticated
  USING (lower(coalesce((SELECT auth.jwt())->>'email', '')) = 'mammadovaaygun33@gmail.com');

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id integer PRIMARY KEY CHECK (id = 1),
  email text NOT NULL,
  password_hash text NOT NULL,
  salt text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
