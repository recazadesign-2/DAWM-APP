
CREATE TABLE public.global_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by authenticated"
  ON public.global_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings writable by admins"
  ON public.global_settings FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));
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

CREATE TABLE public.admin_audit_log (
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
CREATE POLICY "audit readable by admins"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "audit insertable by admins"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND admin_id = auth.uid());
CREATE INDEX idx_audit_created_at ON public.admin_audit_log (created_at DESC);

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','flagged','resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  resolution_note TEXT,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets: owners read own"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR app_private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "tickets: owners create own"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets: admins update"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(),'admin'::public.app_role));
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_tickets_status ON public.support_tickets (status, created_at DESC);

CREATE TABLE public.user_bans (
  user_id UUID PRIMARY KEY,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unbanned_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bans: admin full"
  ON public.user_bans FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "bans: self read"
  ON public.user_bans FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.point_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.point_adjustments TO authenticated;
GRANT ALL ON public.point_adjustments TO service_role;
ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "point_adj: admin all"
  ON public.point_adjustments FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(),'admin'::public.app_role) AND admin_id = auth.uid());
CREATE POLICY "point_adj: self read"
  ON public.point_adjustments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX idx_point_adj_user ON public.point_adjustments (user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.global_settings;
