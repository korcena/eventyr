-- Events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null default 'other' check (type in ('hackathon', 'workshop', 'social', 'other')),
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  telegram_bot_token text,
  telegram_chat_id text,
  invite_token text unique not null default encode(gen_random_bytes(24), 'hex')
);

-- Roles table
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  permissions jsonb not null default '{
    "can_create_todo": false,
    "can_delete_todo": false,
    "can_manage_members": false,
    "can_edit_pages": false,
    "can_view": true,
    "can_edit_event": false,
    "can_manage_shortcuts": false,
    "can_manage_integrations": false
  }'::jsonb,
  created_at timestamptz default now()
);

-- Event members table
create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);

-- Enable RLS
alter table public.events enable row level security;
alter table public.roles enable row level security;
alter table public.event_members enable row level security;

-- Events policies: users can only see/modify events they're a member of
create policy "Events are viewable by members"
  on public.events for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = events.id and em.user_id = auth.uid()
    ) or created_by = auth.uid()
  );

create policy "Users can create events"
  on public.events for insert
  with check (created_by = auth.uid());

create policy "Users can update events"
  on public.events for update
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = events.id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_event')::boolean
    ) or created_by = auth.uid()
  );

create policy "Users can delete events"
  on public.events for delete
  using (created_by = auth.uid());

-- Roles policies: members can view roles for their events
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
  with check (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = roles.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_members')::boolean
    )
  );

create policy "Members with manage_members can update roles"
  on public.roles for update
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = roles.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_members')::boolean
    )
  );

create policy "Members with manage_members can delete roles"
  on public.roles for delete
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = roles.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_members')::boolean
    )
  );

-- Event members policies
create policy "Members can view other members in their events"
  on public.event_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.event_members em2
    where em2.event_id = event_members.event_id and em2.user_id = auth.uid()
  ));

create policy "Users can join events via invite"
  on public.event_members for insert
  with check (user_id = auth.uid());

create policy "Members with manage_members can update member roles"
  on public.event_members for update
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = event_members.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_members')::boolean
    )
  );

create policy "Members can remove themselves or be removed by managers"
  on public.event_members for delete
  using (
    user_id = auth.uid() or exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = event_members.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_manage_members')::boolean
    )
  );

-- Indexes
create index idx_event_members_user on public.event_members(user_id);
create index idx_event_members_event on public.event_members(event_id);
create index idx_roles_event on public.roles(event_id);

-- Function to create default Owner role and add creator as member on event creation
create or replace function public.handle_new_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  role_id uuid;
begin
  -- Create Owner role with all permissions
  insert into public.roles (event_id, name, permissions)
  values (new.id, 'Owner', '{
    "can_create_todo": true,
    "can_delete_todo": true,
    "can_manage_members": true,
    "can_edit_pages": true,
    "can_view": true,
    "can_edit_event": true,
    "can_manage_shortcuts": true,
    "can_manage_integrations": true
  }'::jsonb)
  returning id into role_id;

  -- Add creator as owner member
  insert into public.event_members (event_id, user_id, role_id)
  values (new.id, new.created_by, role_id);

  return new;
end;
$$;

create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();