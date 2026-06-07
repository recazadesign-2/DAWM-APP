
-- Fix profiles: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- Fix group_members role escalation: prevent self-promotion
DROP POLICY IF EXISTS "Users update own membership" ON public.group_members;
CREATE POLICY "Users update own membership (no role change)"
  ON public.group_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT gm.role FROM public.group_members gm WHERE gm.id = group_members.id)
  );

-- Allow group admins to change roles
CREATE POLICY "Group admins can update members"
  ON public.group_members FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));
