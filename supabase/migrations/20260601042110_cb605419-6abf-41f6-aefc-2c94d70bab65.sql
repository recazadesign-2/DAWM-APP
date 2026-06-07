-- Helper: do two users share at least one group?
CREATE OR REPLACE FUNCTION public.shares_group_with(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members m1
    JOIN public.group_members m2 ON m1.group_id = m2.group_id
    WHERE m1.user_id = _a AND m2.user_id = _b
  )
$$;

-- Daily progress per user per date
CREATE TABLE IF NOT EXISTS public.user_daily_progress (
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  quran_target integer NOT NULL DEFAULT 4,
  quran_pages_read integer NOT NULL DEFAULT 0,
  morning_done boolean NOT NULL DEFAULT false,
  evening_done boolean NOT NULL DEFAULT false,
  completion_pct integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_daily_progress TO authenticated;
GRANT ALL ON public.user_daily_progress TO service_role;

ALTER TABLE public.user_daily_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily progress"
ON public.user_daily_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group members can read each other's daily progress"
ON public.user_daily_progress
FOR SELECT
TO authenticated
USING (public.shares_group_with(auth.uid(), user_id));

CREATE TRIGGER set_user_daily_progress_updated_at
BEFORE UPDATE ON public.user_daily_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow observer role on invitations + members
ALTER TABLE public.group_invitations
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Realtime
ALTER TABLE public.user_daily_progress REPLICA IDENTITY FULL;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_daily_progress';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;