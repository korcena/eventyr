-- Fix infinite recursion in roles RLS policies
-- The roles INSERT/UPDATE/DELETE policies join event_members + roles
-- to check can_manage_members. That join on roles triggers the roles
-- SELECT policy, which queries event_members. While event_members
-- SELECT was already simplified, the roles self-reference through
-- the JOIN still causes recursion in some Supabase versions.
--
-- Solution: use a security definer function to check membership and
-- permissions without triggering RLS on the roles table.

create or replace function public.can_manage_members(event_uuid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_members em
    join public.roles r on r.id = em.role_id
    where em.event_id = event_uuid
      and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_members')::boolean
  );
$$;

-- Drop the recursive policies
drop policy if exists "Roles are viewable by event members"
  on public.roles;
drop policy if exists "Members with manage_members can create roles"
  on public.roles;
drop policy if exists "Members with manage_members can update roles"
  on public.roles;
drop policy if exists "Members with manage_members can delete roles"
  on public.roles;

-- Re-create with the security definer function (no recursion)
create policy "Roles are viewable by event members"
  on public.roles for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = roles.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members with manage_members can create roles"
  on public.roles for insert
  with check (public.can_manage_members(event_id));

create policy "Members with manage_members can update roles"
  on public.roles for update
  using (public.can_manage_members(event_id));

create policy "Members with manage_members can delete roles"
  on public.roles for delete
  using (public.can_manage_members(event_id));