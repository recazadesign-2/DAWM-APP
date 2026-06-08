
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  page TEXT, duration_seconds INTEGER, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON public.analytics_events(event_name, created_at DESC);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_insert" ON public.analytics_events;
CREATE POLICY "events_insert" ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "events_admin_read" ON public.analytics_events;
CREATE POLICY "events_admin_read" ON public.analytics_events FOR SELECT
  USING (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_own" ON public.push_subscriptions;
CREATE POLICY "push_own" ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "push_admin_read" ON public.push_subscriptions;
CREATE POLICY "push_admin_read" ON public.push_subscriptions FOR SELECT
  USING (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, body TEXT NOT NULL, url TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_log TO authenticated;
GRANT ALL ON public.notifications_log TO service_role;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_admin" ON public.notifications_log;
CREATE POLICY "notif_admin" ON public.notifications_log FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.reading_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_page integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_state TO authenticated;
GRANT ALL ON public.reading_state TO service_role;
ALTER TABLE public.reading_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reading_own" ON public.reading_state;
CREATE POLICY "reading_own" ON public.reading_state FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS reading_state_set_updated_at ON public.reading_state;
CREATE TRIGGER reading_state_set_updated_at BEFORE UPDATE ON public.reading_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page integer NOT NULL, note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookmarks_own" ON public.bookmarks;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON public.bookmarks(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.premium_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_emails TO authenticated;
GRANT ALL ON public.premium_emails TO service_role;
ALTER TABLE public.premium_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "premium_admin" ON public.premium_emails;
CREATE POLICY "premium_admin" ON public.premium_emails FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_current_user_premium()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (
    SELECT 1 FROM public.premium_emails pe
    JOIN auth.users u ON lower(u.email) = lower(pe.email)
    WHERE u.id = auth.uid()
  )
$f$;
GRANT EXECUTE ON FUNCTION public.is_current_user_premium() TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_prayer_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  timezone text NOT NULL DEFAULT 'Africa/Cairo',
  method text NOT NULL DEFAULT 'Egyptian',
  madhab text NOT NULL DEFAULT 'Shafi',
  notify_fajr boolean NOT NULL DEFAULT true,
  notify_dhuhr boolean NOT NULL DEFAULT true,
  notify_asr boolean NOT NULL DEFAULT true,
  notify_maghrib boolean NOT NULL DEFAULT true,
  notify_isha boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prayer_settings TO authenticated;
GRANT ALL ON public.user_prayer_settings TO service_role;
ALTER TABLE public.user_prayer_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prayer_own" ON public.user_prayer_settings;
CREATE POLICY "prayer_own" ON public.user_prayer_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "prayer_admin_read" ON public.user_prayer_settings;
CREATE POLICY "prayer_admin_read" ON public.user_prayer_settings FOR SELECT
  USING (app_private.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_user_prayer_settings_updated ON public.user_prayer_settings;
CREATE TRIGGER trg_user_prayer_settings_updated BEFORE UPDATE ON public.user_prayer_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_daily_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  quran_target integer NOT NULL DEFAULT 0,
  quran_pages_read integer NOT NULL DEFAULT 0,
  morning_done boolean NOT NULL DEFAULT false,
  evening_done boolean NOT NULL DEFAULT false,
  completion_pct integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  kahf_completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_daily_progress TO authenticated;
GRANT ALL ON public.user_daily_progress TO service_role;
ALTER TABLE public.user_daily_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "udp_own" ON public.user_daily_progress;
CREATE POLICY "udp_own" ON public.user_daily_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "udp_admin_read" ON public.user_daily_progress;
CREATE POLICY "udp_admin_read" ON public.user_daily_progress FOR SELECT
  USING (app_private.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_udp_updated ON public.user_daily_progress;
CREATE TRIGGER trg_udp_updated BEFORE UPDATE ON public.user_daily_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  points integer NOT NULL,
  multiplier integer NOT NULL DEFAULT 1,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.points_history TO authenticated;
GRANT ALL ON public.points_history TO service_role;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ph_own" ON public.points_history;
CREATE POLICY "ph_own" ON public.points_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ph_insert_own" ON public.points_history;
CREATE POLICY "ph_insert_own" ON public.points_history FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ph_admin_read" ON public.points_history;
CREATE POLICY "ph_admin_read" ON public.points_history FOR SELECT
  USING (app_private.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS ph_user_idx ON public.points_history(user_id, created_at DESC);
