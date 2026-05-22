-- ============================================================
-- PadhaiSathi — schema.sql  v2 (fixed)
-- Safe to re-run on a fresh Supabase project.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums (safe re-run via DO block) ────────────────────────
-- FIX: PostgreSQL has no CREATE TYPE IF NOT EXISTS — use exception handler
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flashcard_source AS ENUM ('ai_generated', 'admin', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flashcard_rating AS ENUM ('again', 'hard', 'good', 'easy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quiz_mode AS ENUM ('scholar', 'storm', 'sovereign');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_session_type AS ENUM ('doubt', 'summary', 'quiz_gen', 'flashcard_gen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name          TEXT        NOT NULL,
  email              TEXT        NOT NULL UNIQUE,
  class_level        SMALLINT    NOT NULL CHECK (class_level IN (8, 9, 10)),
  preferred_language TEXT        NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'ne')),
  role               user_role   NOT NULL DEFAULT 'student',
  streak             INTEGER     NOT NULL DEFAULT 0,
  last_active        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── teacher_verifications ───────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_verifications (
  id           UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_name  TEXT                NOT NULL,
  document_url TEXT                NOT NULL,
  status       verification_status NOT NULL DEFAULT 'pending',
  reviewed_by  UUID                REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─── admin_permissions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_permissions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permissions   JSONB       NOT NULL DEFAULT '{
    "manage_users": false,
    "manage_content": false,
    "manage_teachers": false,
    "view_analytics": false
  }'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── subjects ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  class_level SMALLINT[]  NOT NULL,
  icon        TEXT        NOT NULL DEFAULT '📚',
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  bg_pattern  TEXT,
  order_index SMALLINT    NOT NULL DEFAULT 0
);

-- ─── chapters ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  order_index SMALLINT    NOT NULL DEFAULT 0,
  class_level SMALLINT    NOT NULL CHECK (class_level IN (8, 9, 10)),
  UNIQUE (subject_id, slug, class_level)
);

-- ─── user_notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notes (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id       UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  content_text     TEXT        NOT NULL,
  is_public        BOOLEAN     NOT NULL DEFAULT FALSE,
  uploaded_by_role user_role   NOT NULL DEFAULT 'student',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── flashcards ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcards (
  id         UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id UUID             NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  front      TEXT             NOT NULL,
  back       TEXT             NOT NULL,
  difficulty SMALLINT         NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
  source     flashcard_source NOT NULL DEFAULT 'ai_generated'
);

-- ─── flashcard_reviews ───────────────────────────────────────
-- FIX: renamed `interval` → `review_interval` (interval is a reserved PG keyword)
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id              UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID             NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flashcard_id    UUID             NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  rating          flashcard_rating NOT NULL,
  next_review_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  review_interval INTEGER          NOT NULL DEFAULT 1,
  ease_factor     NUMERIC(4,2)     NOT NULL DEFAULT 2.50,
  reviewed_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, flashcard_id)
);

-- ─── quiz_sessions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id   UUID        NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  mode         quiz_mode   NOT NULL,
  score        SMALLINT    NOT NULL DEFAULT 0,
  total        SMALLINT    NOT NULL DEFAULT 0,
  time_taken   INTEGER     NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── quiz_attempts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID        NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_text   TEXT        NOT NULL,
  options         JSONB       NOT NULL,
  selected_answer TEXT        NOT NULL,
  correct_answer  TEXT        NOT NULL,
  explanation     TEXT,
  is_correct      BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ─── user_progress ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id     UUID         NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_id     UUID         NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  flashcard_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (flashcard_pct BETWEEN 0 AND 100),
  quiz_avg_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (quiz_avg_score BETWEEN 0 AND 100),
  is_weak        BOOLEAN      NOT NULL DEFAULT FALSE,
  last_accessed  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chapter_id)
);

-- ─── streaks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak  INTEGER     NOT NULL DEFAULT 0,
  longest_streak  INTEGER     NOT NULL DEFAULT 0,
  last_study_date DATE
);

-- ─── ai_sessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_sessions (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id      UUID            REFERENCES chapters(id) ON DELETE SET NULL,
  type            ai_session_type NOT NULL,
  provider_used   TEXT            NOT NULL,
  response_cached BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── leaderboard_scores ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_xp  INTEGER     NOT NULL DEFAULT 0,
  total_xp   INTEGER     NOT NULL DEFAULT 0,
  rank       INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email     ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_class     ON profiles(class_level);

CREATE INDEX IF NOT EXISTS idx_chapters_subject   ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_class     ON chapters(class_level);

CREATE INDEX IF NOT EXISTS idx_notes_user         ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_chapter      ON user_notes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_notes_public       ON user_notes(is_public) WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_flashcards_chapter ON flashcards(chapter_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user       ON flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_next       ON flashcard_reviews(next_review_at);
CREATE INDEX IF NOT EXISTS idx_reviews_user_card  ON flashcard_reviews(user_id, flashcard_id);

CREATE INDEX IF NOT EXISTS idx_quiz_user          ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_chapter       ON quiz_sessions(chapter_id);

CREATE INDEX IF NOT EXISTS idx_attempts_session   ON quiz_attempts(session_id);

CREATE INDEX IF NOT EXISTS idx_progress_user      ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_weak      ON user_progress(user_id, is_weak) WHERE is_weak = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_user            ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_created         ON ai_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_lb_weekly          ON leaderboard_scores(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_lb_total           ON leaderboard_scores(total_xp DESC);

-- ============================================================
-- HELPER FUNCTIONS (before triggers & RLS)
-- ============================================================

-- FIX: Defined before triggers so they exist when triggers fire
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- ─── auto-create profile + streak + leaderboard on signup ────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, class_level, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'class_level')::smallint, 10),
    CASE
      WHEN NEW.email = 'ihcarpgamerz@gmail.com' THEN 'admin'::user_role
      ELSE 'student'::user_role
    END
  );

  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  INSERT INTO public.leaderboard_scores (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── update last_active on profile update ────────────────────
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_last_active ON profiles;
CREATE TRIGGER trg_profile_last_active
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_last_active();

-- ─── update streak on study activity ─────────────────────────
CREATE OR REPLACE FUNCTION update_streak_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date DATE;
  v_current   INTEGER;
  v_longest   INTEGER;
BEGIN
  SELECT last_study_date, current_streak, longest_streak
  INTO v_last_date, v_current, v_longest
  FROM public.streaks
  WHERE user_id = NEW.user_id;

  -- Only update if we haven't already counted today
  IF v_last_date IS NULL OR v_last_date < CURRENT_DATE THEN
    IF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Consecutive day — extend streak
      v_current := v_current + 1;
    ELSE
      -- Missed days or first time — reset to 1
      v_current := 1;
    END IF;

    v_longest := GREATEST(v_current, v_longest);

    UPDATE public.streaks
    SET current_streak  = v_current,
        longest_streak  = v_longest,
        last_study_date = CURRENT_DATE
    WHERE user_id = NEW.user_id;

    UPDATE public.profiles
    SET streak = v_current
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_streak_on_review ON flashcard_reviews;
CREATE TRIGGER trg_streak_on_review
  AFTER INSERT OR UPDATE ON flashcard_reviews
  FOR EACH ROW EXECUTE FUNCTION update_streak_on_activity();

DROP TRIGGER IF EXISTS trg_streak_on_quiz ON quiz_sessions;
CREATE TRIGGER trg_streak_on_quiz
  AFTER INSERT ON quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION update_streak_on_activity();

-- ─── touch updated_at on leaderboard changes ─────────────────
CREATE OR REPLACE FUNCTION touch_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_touch ON leaderboard_scores;
CREATE TRIGGER trg_leaderboard_touch
  BEFORE UPDATE ON leaderboard_scores
  FOR EACH ROW EXECUTE FUNCTION touch_leaderboard();

-- ─── weekly XP reset (call from Edge Function cron) ──────────
CREATE OR REPLACE FUNCTION reset_weekly_xp()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leaderboard_scores SET weekly_xp = 0;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress         ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_scores    ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: users read own"     ON profiles;
DROP POLICY IF EXISTS "profiles: users update own"   ON profiles;
DROP POLICY IF EXISTS "profiles: admin read all"     ON profiles;
DROP POLICY IF EXISTS "profiles: admin update all"   ON profiles;
DROP POLICY IF EXISTS "profiles: insert via trigger" ON profiles;

CREATE POLICY "profiles: users read own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- FIX: removed recursive subquery from WITH CHECK — role changes
-- go through admin client (service role) which bypasses RLS
CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: admin read all"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "profiles: admin update all"
  ON profiles FOR UPDATE
  USING (is_admin());

CREATE POLICY "profiles: insert via trigger"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── teacher_verifications ───────────────────────────────────
DROP POLICY IF EXISTS "tv: user reads own"    ON teacher_verifications;
DROP POLICY IF EXISTS "tv: user inserts own"  ON teacher_verifications;
DROP POLICY IF EXISTS "tv: admin manages all" ON teacher_verifications;

CREATE POLICY "tv: user reads own"
  ON teacher_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tv: user inserts own"
  ON teacher_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tv: admin manages all"
  ON teacher_verifications FOR ALL
  USING (is_admin());

-- ─── admin_permissions ───────────────────────────────────────
DROP POLICY IF EXISTS "ap: admin only" ON admin_permissions;

CREATE POLICY "ap: admin only"
  ON admin_permissions FOR ALL
  USING (is_admin());

-- ─── subjects ────────────────────────────────────────────────
DROP POLICY IF EXISTS "subjects: authenticated read" ON subjects;
DROP POLICY IF EXISTS "subjects: admin manage"       ON subjects;

-- FIX: auth.role() deprecated → auth.uid() IS NOT NULL
CREATE POLICY "subjects: authenticated read"
  ON subjects FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "subjects: admin manage"
  ON subjects FOR ALL
  USING (is_admin());

-- ─── chapters ────────────────────────────────────────────────
DROP POLICY IF EXISTS "chapters: authenticated read" ON chapters;
DROP POLICY IF EXISTS "chapters: admin manage"       ON chapters;

CREATE POLICY "chapters: authenticated read"
  ON chapters FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "chapters: admin manage"
  ON chapters FOR ALL
  USING (is_admin());

-- ─── user_notes ──────────────────────────────────────────────
DROP POLICY IF EXISTS "notes: user reads own"         ON user_notes;
DROP POLICY IF EXISTS "notes: public reads published"  ON user_notes;
DROP POLICY IF EXISTS "notes: user inserts own"        ON user_notes;
DROP POLICY IF EXISTS "notes: user updates own"        ON user_notes;
DROP POLICY IF EXISTS "notes: user deletes own"        ON user_notes;
DROP POLICY IF EXISTS "notes: admin manages all"       ON user_notes;

CREATE POLICY "notes: user reads own"
  ON user_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notes: public reads published"
  ON user_notes FOR SELECT
  USING (is_public = TRUE AND auth.uid() IS NOT NULL);

CREATE POLICY "notes: user inserts own"
  ON user_notes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (is_public = FALSE OR is_teacher())
  );

CREATE POLICY "notes: user updates own"
  ON user_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (is_public = FALSE OR is_teacher())
  );

CREATE POLICY "notes: user deletes own"
  ON user_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "notes: admin manages all"
  ON user_notes FOR ALL
  USING (is_admin());

-- ─── flashcards ──────────────────────────────────────────────
DROP POLICY IF EXISTS "flashcards: authenticated read" ON flashcards;
DROP POLICY IF EXISTS "flashcards: admin manage"       ON flashcards;
DROP POLICY IF EXISTS "flashcards: teacher insert"     ON flashcards;

CREATE POLICY "flashcards: authenticated read"
  ON flashcards FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "flashcards: admin manage"
  ON flashcards FOR ALL
  USING (is_admin());

CREATE POLICY "flashcards: teacher insert"
  ON flashcards FOR INSERT
  WITH CHECK (is_teacher() AND source = 'teacher');

-- ─── flashcard_reviews ───────────────────────────────────────
DROP POLICY IF EXISTS "reviews: user manages own" ON flashcard_reviews;

CREATE POLICY "reviews: user manages own"
  ON flashcard_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── quiz_sessions ───────────────────────────────────────────
DROP POLICY IF EXISTS "quiz_sessions: user manages own" ON quiz_sessions;
DROP POLICY IF EXISTS "quiz_sessions: admin read all"   ON quiz_sessions;

CREATE POLICY "quiz_sessions: user manages own"
  ON quiz_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quiz_sessions: admin read all"
  ON quiz_sessions FOR SELECT
  USING (is_admin());

-- ─── quiz_attempts ───────────────────────────────────────────
DROP POLICY IF EXISTS "quiz_attempts: user reads own" ON quiz_attempts;
DROP POLICY IF EXISTS "quiz_attempts: user inserts"   ON quiz_attempts;

CREATE POLICY "quiz_attempts: user reads own"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions qs
      WHERE qs.id = session_id AND qs.user_id = auth.uid()
    )
  );

CREATE POLICY "quiz_attempts: user inserts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_sessions qs
      WHERE qs.id = session_id AND qs.user_id = auth.uid()
    )
  );

-- ─── user_progress ───────────────────────────────────────────
DROP POLICY IF EXISTS "progress: user manages own" ON user_progress;
DROP POLICY IF EXISTS "progress: admin read all"   ON user_progress;

CREATE POLICY "progress: user manages own"
  ON user_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress: admin read all"
  ON user_progress FOR SELECT
  USING (is_admin());

-- ─── streaks ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "streaks: user manages own" ON streaks;

CREATE POLICY "streaks: user manages own"
  ON streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── ai_sessions ─────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_sessions: user manages own" ON ai_sessions;
DROP POLICY IF EXISTS "ai_sessions: admin read all"   ON ai_sessions;

CREATE POLICY "ai_sessions: user manages own"
  ON ai_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_sessions: admin read all"
  ON ai_sessions FOR SELECT
  USING (is_admin());

-- ─── leaderboard_scores ──────────────────────────────────────
DROP POLICY IF EXISTS "leaderboard: authenticated read all" ON leaderboard_scores;
DROP POLICY IF EXISTS "leaderboard: user updates own"       ON leaderboard_scores;
DROP POLICY IF EXISTS "leaderboard: admin manages all"      ON leaderboard_scores;

CREATE POLICY "leaderboard: authenticated read all"
  ON leaderboard_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "leaderboard: user updates own"
  ON leaderboard_scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leaderboard: admin manages all"
  ON leaderboard_scores FOR ALL
  USING (is_admin());

-- ============================================================
-- DONE
-- Sign up ihcarpgamerz@gmail.com via the app — trigger will
-- auto-set role='admin'. No manual SQL needed after this.
-- ============================================================