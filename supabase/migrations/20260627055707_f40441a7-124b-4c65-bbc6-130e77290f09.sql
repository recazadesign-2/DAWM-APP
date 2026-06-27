
-- 1) Restrict public-readable tables to authenticated users
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS settings_read ON public.app_settings;
CREATE POLICY settings_read ON public.app_settings
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.app_settings FROM anon;

DROP POLICY IF EXISTS strings_read ON public.dynamic_strings;
CREATE POLICY strings_read ON public.dynamic_strings
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.dynamic_strings FROM anon;

-- 2) Remove client-side INSERT for points_history; route through SECURITY DEFINER fn
DROP POLICY IF EXISTS ph_insert_own ON public.points_history;
REVOKE INSERT ON public.points_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_points_event(
  _action_type text,
  _points integer,
  _multiplier numeric DEFAULT 1,
  _metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _points IS NULL OR _points <= 0 OR _points > 1000 THEN
    RAISE EXCEPTION 'invalid points';
  END IF;
  IF _multiplier IS NULL OR _multiplier <= 0 OR _multiplier > 10 THEN
    RAISE EXCEPTION 'invalid multiplier';
  END IF;
  INSERT INTO public.points_history (user_id, action_type, points, multiplier, metadata)
  VALUES (_uid, _action_type, _points, _multiplier, _metadata);
END;
$$;
REVOKE ALL ON FUNCTION public.record_points_event(text, integer, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_points_event(text, integer, numeric, jsonb) TO authenticated;

-- 3) Remove client INSERT/UPDATE on user_badges; route through SECURITY DEFINER fn
DROP POLICY IF EXISTS badges_own ON public.user_badges;
CREATE POLICY badges_select_own ON public.user_badges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.award_user_badge(
  _badge_id text,
  _earned_at timestamptz DEFAULT now()
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF _badge_id IS NULL OR length(_badge_id) = 0 OR length(_badge_id) > 64 THEN
    RAISE EXCEPTION 'invalid badge';
  END IF;
  INSERT INTO public.user_badges (user_id, badge_id, earned_at)
  VALUES (_uid, _badge_id, COALESCE(_earned_at, now()))
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.award_user_badge(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_user_badge(text, timestamptz) TO authenticated;

-- 4) Lock down existing SECURITY DEFINER functions: revoke from PUBLIC/anon
REVOKE ALL ON FUNCTION public.is_current_user_premium() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_premium() TO authenticated;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Also lock down our new SECURITY DEFINER helpers from anon (already done) — confirmed above.
