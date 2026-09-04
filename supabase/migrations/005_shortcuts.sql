-- Shortcuts table
create table if not exists public.shortcuts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  url text not null,
  icon text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.shortcuts enable row level security;

-- Members can view shortcuts in their events
create policy "Members can view shortcuts in their events"
  on public.shortcuts for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = shortcuts.event_id and em.user_id = auth.uid()
    )
  );

-- Members with can_manage_shortcuts can create shortcuts
create policy "Members with can_manage_shortcuts can create shortcuts"
  on public.shortcuts for insert
  with check (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = shortcuts.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_shortcuts')::boolean
    )
  );

-- Members with can_manage_shortcuts can update shortcuts
create policy "Members with can_manage_shortcuts can update shortcuts"
  on public.shortcuts for update
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = shortcuts.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_shortcuts')::boolean
    )
  );

-- Members with can_manage_shortcuts can delete shortcuts
create policy "Members with can_manage_shortcuts can delete shortcuts"
  on public.shortcuts for delete
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = shortcuts.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_shortcuts')::boolean
    )
  );

-- Indexes
create index idx_shortcuts_event on public.shortcuts(event_id);