-- Fix: event_members.role_id has on delete cascade, which means
-- deleting a role deletes all members with that role. This is
-- dangerous and also fails RLS (the cascade can't delete other
-- users' memberships). Change to on delete set null so deleting
-- a role just unassigns members instead of removing them.

alter table public.event_members
  drop constraint if exists event_members_role_id_fkey;

alter table public.event_members
  add constraint event_members_role_id_fkey
  foreign key (role_id) references public.roles(id)
  on delete set null;