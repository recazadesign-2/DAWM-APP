
ALTER TABLE public.user_daily_detail
  ADD COLUMN IF NOT EXISTS start_page integer,
  ADD COLUMN IF NOT EXISTS target_goal integer,
  ADD COLUMN IF NOT EXISTS last_read_page integer,
  ADD COLUMN IF NOT EXISTS last_completed_page integer,
  ADD COLUMN IF NOT EXISTS azkar_morning jsonb,
  ADD COLUMN IF NOT EXISTS azkar_evening jsonb,
  ADD COLUMN IF NOT EXISTS kahf_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_awarded jsonb,
  ADD COLUMN IF NOT EXISTS usage_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_gamification
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  details jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_own" ON public.user_activity;
CREATE POLICY "activity_own" ON public.user_activity FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_wird_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal integer NOT NULL DEFAULT 1,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wird_settings TO authenticated;
GRANT ALL ON public.user_wird_settings TO service_role;
ALTER TABLE public.user_wird_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wird_own" ON public.user_wird_settings;
CREATE POLICY "wird_own" ON public.user_wird_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_uws_updated ON public.user_wird_settings;
CREATE TRIGGER trg_uws_updated BEFORE UPDATE ON public.user_wird_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
