
DROP POLICY IF EXISTS "Invitee can update status" ON public.group_invitations;
CREATE POLICY "Invitee can update status"
ON public.group_invitations
FOR UPDATE
TO authenticated
USING (invited_user_id = auth.uid())
WITH CHECK (
  invited_user_id = auth.uid()
  AND role = (SELECT gi.role FROM public.group_invitations gi WHERE gi.id = group_invitations.id)
  AND group_id = (SELECT gi.group_id FROM public.group_invitations gi WHERE gi.id = group_invitations.id)
  AND invited_by = (SELECT gi.invited_by FROM public.group_invitations gi WHERE gi.id = group_invitations.id)
);

DROP POLICY IF EXISTS "Users can insert themselves on accept (or admin adds)" ON public.group_members;
CREATE POLICY "Users can insert themselves on accept (or admin adds)"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid() AND role = 'member')
  OR public.is_group_admin(group_id, auth.uid())
);
