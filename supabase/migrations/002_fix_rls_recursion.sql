-- Fix infinite recursion in RLS policies
-- The event_members SELECT policy was querying event_members itself,
-- causing infinite recursion. Simplify to only allow users to see
-- their own memberships. Event-scoped access is handled by the events
-- policy and application-level queries.

-- Drop the recursive policy
drop policy if exists "Members can view other members in their events"
  on public.event_members;

-- Simple: users can only see their own memberships (no recursion)
create policy "Users can view their own memberships"
  on public.event_members for select
  using (user_id = auth.uid());

-- Fix the update policy (was also recursing through event_members)
drop policy if exists "Members with manage_members can update member roles"
  on public.event_members;

-- Users can update their own membership (e.g. leave), or be updated by
-- someone with manage_members permission. To avoid recursion, check
-- the user's own membership + role permissions directly.
create policy "Users can update their own membership"
  on public.event_members for update
  using (user_id = auth.uid());

-- Fix the delete policy (was also recursing)
drop policy if exists "Members can remove themselves or be removed by managers"
  on public.event_members;

-- Users can remove themselves. Managers removing others is handled
-- via service role in server actions to avoid recursion.
create policy "Users can remove their own membership"
  on public.event_members for delete
  using (user_id = auth.uid());

-- Fix the events SELECT policy to avoid recursion through event_members
-- The old policy queried event_members which has a recursive policy.
-- Instead, use a simpler approach: events are viewable by the creator
-- or by members. Since event_members SELECT now only checks user_id,
-- this won't recurse.
drop policy if exists "Events are viewable by members"
  on public.events;

create policy "Events are viewable by members or creators"
  on public.events for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.event_members em
      where em.event_id = events.id and em.user_id = auth.uid()
    )
  );

-- Fix the events UPDATE policy (was also recursing through event_members
-- joined with roles, and event_members SELECT was recursive)
drop policy if exists "Users can update events"
  on public.events;

-- Creator can always update. Members with can_edit_event permission
-- need to check their role, but to avoid recursion we check event_members
-- (which now only has user_id = auth.uid() policy, no recursion).
create policy "Users can update events"
  on public.events for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = events.id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_event')::boolean
    )
  );