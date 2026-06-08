
DROP FUNCTION IF EXISTS public.find_user_id_by_email(text);
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1
$f$;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text,
  friday_theme boolean NOT NULL DEFAULT true,
  lossless_audio boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT true,
  reminder_time text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prefs_own" ON public.user_preferences;
CREATE POLICY "prefs_own" ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_user_prefs_updated ON public.user_preferences;
CREATE TRIGGER trg_user_prefs_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_gamification TO authenticated;
GRANT ALL ON public.user_gamification TO service_role;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gam_own" ON public.user_gamification;
CREATE POLICY "gam_own" ON public.user_gamification FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_user_gam_updated ON public.user_gamification;
CREATE TRIGGER trg_user_gam_updated BEFORE UPDATE ON public.user_gamification
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_own" ON public.user_badges;
CREATE POLICY "badges_own" ON public.user_badges FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_daily_detail (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  tracked_pages jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_daily_detail TO authenticated;
GRANT ALL ON public.user_daily_detail TO service_role;
ALTER TABLE public.user_daily_detail ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "udd_own" ON public.user_daily_detail;
CREATE POLICY "udd_own" ON public.user_daily_detail FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_udd_updated ON public.user_daily_detail;
CREATE TRIGGER trg_udd_updated BEFORE UPDATE ON public.user_daily_detail
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
