
-- ============ GROUPS TABLE ============
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'family',
  image_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ============ GROUP MEMBERS ============
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  progress INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- ============ GROUP INVITATIONS ============
CREATE TABLE public.group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(group_id, invited_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_invitations TO authenticated;
GRANT ALL ON public.group_invitations TO service_role;

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS (avoid RLS recursion) ============
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND created_by = _user_id
  )
$$;

-- Lookup user_id by email (used to validate invitations)
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID, UUID) TO authenticated;

-- ============ RLS POLICIES: groups ============
CREATE POLICY "Members can view their groups"
  ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update group"
  ON public.groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete group"
  ON public.groups FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ============ RLS POLICIES: group_members ============
CREATE POLICY "Members can view group memberships"
  ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Users can insert themselves on accept (or admin adds)"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Users update own membership"
  ON public.group_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can remove members / users can leave"
  ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- ============ RLS POLICIES: group_invitations ============
CREATE POLICY "Invitee and admin can view invitations"
  ON public.group_invitations FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Admin can create invitations"
  ON public.group_invitations FOR INSERT TO authenticated
  WITH CHECK (public.is_group_admin(group_id, auth.uid()) AND invited_by = auth.uid());

CREATE POLICY "Invitee can update status"
  ON public.group_invitations FOR UPDATE TO authenticated
  USING (invited_user_id = auth.uid());

CREATE POLICY "Admin or invitee can delete"
  ON public.group_invitations FOR DELETE TO authenticated
  USING (invited_user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- ============ Trigger: creator auto-added as admin member ============
CREATE OR REPLACE FUNCTION public.add_creator_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_add_creator_member
AFTER INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_member();

-- updated_at trigger
CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
