
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  group_type text NOT NULL DEFAULT 'family',
  image_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS gm_user_idx ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS gm_group_idx ON public.group_members(group_id);

CREATE TABLE IF NOT EXISTS public.group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, invited_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invitations TO authenticated;
GRANT ALL ON public.group_invitations TO service_role;
ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.groups WHERE id = _group_id AND created_by = _user_id)
$f$;
GRANT EXECUTE ON FUNCTION app_private.is_group_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $f$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1
$f$;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;

DROP POLICY IF EXISTS "groups_member_read" ON public.groups;
CREATE POLICY "groups_member_read" ON public.groups FOR SELECT
  USING (created_by = auth.uid() OR app_private.is_group_member(id, auth.uid()));
DROP POLICY IF EXISTS "groups_creator_insert" ON public.groups;
CREATE POLICY "groups_creator_insert" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "groups_creator_update" ON public.groups;
CREATE POLICY "groups_creator_update" ON public.groups FOR UPDATE USING (auth.uid() = created_by);
DROP POLICY IF EXISTS "groups_creator_delete" ON public.groups;
CREATE POLICY "groups_creator_delete" ON public.groups FOR DELETE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "gm_member_read" ON public.group_members;
CREATE POLICY "gm_member_read" ON public.group_members FOR SELECT
  USING (app_private.is_group_member(group_id, auth.uid()));
DROP POLICY IF EXISTS "gm_creator_manage" ON public.group_members;
CREATE POLICY "gm_creator_manage" ON public.group_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid()));
DROP POLICY IF EXISTS "gm_self_leave" ON public.group_members;
CREATE POLICY "gm_self_leave" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "gi_self_read" ON public.group_invitations;
CREATE POLICY "gi_self_read" ON public.group_invitations FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
DROP POLICY IF EXISTS "gi_inviter_insert" ON public.group_invitations;
CREATE POLICY "gi_inviter_insert" ON public.group_invitations FOR INSERT
  WITH CHECK (auth.uid() = invited_by AND EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid()
  ));
DROP POLICY IF EXISTS "gi_self_update" ON public.group_invitations;
CREATE POLICY "gi_self_update" ON public.group_invitations FOR UPDATE
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
DROP POLICY IF EXISTS "gi_self_delete" ON public.group_invitations;
CREATE POLICY "gi_self_delete" ON public.group_invitations FOR DELETE
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
