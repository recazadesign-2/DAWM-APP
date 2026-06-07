
CREATE TABLE IF NOT EXISTS public.user_prayer_settings (
  user_id uuid PRIMARY KEY,
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

ALTER TABLE public.user_prayer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prayer settings" ON public.user_prayer_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all prayer settings" ON public.user_prayer_settings
  FOR SELECT USING (app_private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_prayer_settings_updated
  BEFORE UPDATE ON public.user_prayer_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
