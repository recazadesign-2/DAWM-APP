CREATE TABLE IF NOT EXISTS public.user_wird_settings (
  user_id uuid PRIMARY KEY,
  daily_goal integer NOT NULL DEFAULT 4,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wird_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wird settings"
  ON public.user_wird_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_user_wird_settings_updated_at
  BEFORE UPDATE ON public.user_wird_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();