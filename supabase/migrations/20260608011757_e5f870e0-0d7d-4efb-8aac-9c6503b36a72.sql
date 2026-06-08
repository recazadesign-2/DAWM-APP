
ALTER TABLE public.user_activity
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS device_info jsonb;
DO $$ BEGIN
  ALTER TABLE public.user_activity ADD CONSTRAINT user_activity_user_unique UNIQUE (user_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
ALTER TABLE public.user_activity ALTER COLUMN activity_type DROP NOT NULL;

ALTER TABLE public.user_gamification
  ADD COLUMN IF NOT EXISTS current_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_tasbeeh integer NOT NULL DEFAULT 0;

ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;
