
CREATE TABLE IF NOT EXISTS public.global_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings readable by authenticated" ON public.global_settings;
CREATE POLICY "settings readable by authenticated"
  ON public.global_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings writable by admins" ON public.global_settings;
CREATE POLICY "settings writable by admins"
  ON public.global_settings FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP TRIGGER IF EXISTS set_global_settings_updated_at ON public.global_settings;
CREATE TRIGGER set_global_settings_updated_at
  BEFORE UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.global_settings (key, value, description) VALUES
  ('min_continuous_time',      to_jsonb(120), 'Minimum continuous reading seconds to count a page'),
  ('max_cumulative_time',      to_jsonb(300), 'Maximum cumulative seconds (OR threshold)'),
  ('buffer_time_limit',        to_jsonb(10),  'Allowed buffer gap seconds before streak resets'),
  ('morning_adhkar_threshold', to_jsonb(60),  'Seconds for morning adhkar completion'),
  ('evening_adhkar_threshold', to_jsonb(60),  'Seconds for evening adhkar completion'),
  ('points_quran_page',          to_jsonb(5),  'Points per Quran page'),
  ('points_quran_wird_bonus',    to_jsonb(5),  'Retroactive bonus per page on wird completion'),
  ('points_morning_adhkar',      to_jsonb(10), 'Points for morning adhkar'),
  ('points_evening_adhkar',      to_jsonb(10), 'Points for evening adhkar'),
  ('points_tasbeeh_33',          to_jsonb(10), 'Points per 33-count tasbeeh iteration')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit readable by admins" ON public.admin_audit_log;
CREATE POLICY "audit readable by admins"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "audit insertable by admins" ON public.admin_audit_log;
CREATE POLICY "audit insertable by admins"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND admin_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.admin_audit_log (created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='global_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_settings;
  END IF;
END $$;
