
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_invitations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
