
-- 1) profiles extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- 2) user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system',
  friday_theme boolean NOT NULL DEFAULT false,
  lossless_audio boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT true,
  reminder_time text NOT NULL DEFAULT '08:00',
  mushaf_mode text NOT NULL DEFAULT 'interactive',
  sound_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  system_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON public.user_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_preferences_updated
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) user_gamification (lifetime totals — outputs of existing engines, not recomputed in SQL)
CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  total_xp integer NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_tasbeeh integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_gamification TO authenticated;
GRANT ALL ON public.user_gamification TO service_role;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own gamification" ON public.user_gamification
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own gamification" ON public.user_gamification
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own gamification" ON public.user_gamification
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Group members read each other gamification" ON public.user_gamification
  FOR SELECT TO authenticated
  USING (public.shares_group_with(auth.uid(), user_id));
CREATE TRIGGER trg_user_gamification_updated
  BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own badges" ON public.user_badges
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) user_achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON public.user_achievements (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievements" ON public.user_achievements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_achievements_updated
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) user_daily_detail (per-day raw state from progressService — stored, not recomputed)
CREATE TABLE IF NOT EXISTS public.user_daily_detail (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  tracked_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  azkar_morning jsonb,
  azkar_evening jsonb,
  kahf_completed boolean NOT NULL DEFAULT false,
  usage_seconds integer NOT NULL DEFAULT 0,
  points_awarded jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_page integer,
  target_goal integer,
  last_read_page integer,
  last_completed_page integer,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
CREATE INDEX IF NOT EXISTS user_daily_detail_user_date_idx
  ON public.user_daily_detail (user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_daily_detail TO authenticated;
GRANT ALL ON public.user_daily_detail TO service_role;
ALTER TABLE public.user_daily_detail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily detail" ON public.user_daily_detail
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_daily_detail_updated
  BEFORE UPDATE ON public.user_daily_detail
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) user_activity
CREATE TABLE IF NOT EXISTS public.user_activity (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_login_at timestamptz,
  last_active_at timestamptz,
  device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activity" ON public.user_activity
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_activity_updated
  BEFORE UPDATE ON public.user_activity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
