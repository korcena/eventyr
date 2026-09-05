-- ============================================================================
-- Eventyr — Consolidated Database Schema
-- Run this single file in the Supabase SQL Editor for a fresh setup.
-- After running, reload the schema cache: NOTIFY pgrst, 'reload schema';
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Profiles
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Events
-- ----------------------------------------------------------------------------
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

alter table public.events enable row level security;

create policy "Events are viewable by members or creators"
  on public.events for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.event_members em
      where em.event_id = events.id and em.user_id = auth.uid()
    )
  );

create policy "Users can create events"
  on public.events for insert
  with check (created_by = auth.uid());

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

create policy "Users can delete events"
  on public.events for delete
  using (created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
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

alter table public.roles enable row level security;

-- Security definer function to avoid RLS recursion on roles
create or replace function public.can_manage_members(event_uuid uuid)
returns boolean language sql stable
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

-- ----------------------------------------------------------------------------
-- Event members
-- ----------------------------------------------------------------------------
create table if not exists public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.event_members enable row level security;

create policy "Users can view their own memberships"
  on public.event_members for select
  using (user_id = auth.uid());

create policy "Users can join events via invite"
  on public.event_members for insert
  with check (user_id = auth.uid());

create policy "Users can update their own membership"
  on public.event_members for update
  using (user_id = auth.uid());

create policy "Users can remove their own membership"
  on public.event_members for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Trigger: auto-create Owner role + add creator as member on event creation
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_event()
returns trigger language plpgsql
security definer set search_path = public
as $$
declare
  role_id uuid;
begin
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

  insert into public.event_members (event_id, user_id, role_id)
  values (new.id, new.created_by, role_id);

  return new;
end;
$$;

drop trigger if exists on_event_created on public.events;
create trigger on_event_created
  after insert on public.events
  for each row execute function public.handle_new_event();

-- ----------------------------------------------------------------------------
-- Todos
-- ----------------------------------------------------------------------------
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.todos enable row level security;

create policy "Members can view todos in their events"
  on public.todos for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = todos.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members with can_create_todo can create todos"
  on public.todos for insert
  with check (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = todos.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_create_todo')::boolean
    )
  );

create policy "Members can update todos in their events"
  on public.todos for update
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = todos.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members with can_delete_todo can delete todos"
  on public.todos for delete
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = todos.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_delete_todo')::boolean
    ) or assigned_to = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- Todo assignees (multiple assignees per todo)
-- ----------------------------------------------------------------------------
create table if not exists public.todo_assignees (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(todo_id, user_id)
);

alter table public.todo_assignees enable row level security;

create policy "Members can view todo assignees"
  on public.todo_assignees for select
  using (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      where t.id = todo_id and em.user_id = auth.uid()
    )
  );

create policy "Can insert todo assignees"
  on public.todo_assignees for insert
  with check (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      join public.roles r on r.id = em.role_id
      where t.id = todo_id and em.user_id = auth.uid()
      and (r.permissions->>'can_create_todo')::boolean
    )
  );

create policy "Can delete todo assignees"
  on public.todo_assignees for delete
  using (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      join public.roles r on r.id = em.role_id
      where t.id = todo_id and em.user_id = auth.uid()
      and (r.permissions->>'can_create_todo')::boolean
    )
  );

-- ----------------------------------------------------------------------------
-- Todo dependencies
-- ----------------------------------------------------------------------------
create table if not exists public.todo_dependencies (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  depends_on_todo_id uuid not null references public.todos(id) on delete cascade,
  unique(todo_id, depends_on_todo_id),
  check (todo_id != depends_on_todo_id)
);

alter table public.todo_dependencies enable row level security;

create policy "Members can view dependencies in their events"
  on public.todo_dependencies for select
  using (
    exists (
      select 1 from public.todo_dependencies td
      join public.todos t on t.id = td.todo_id
      join public.event_members em on em.event_id = t.event_id
      where td.todo_id = todo_dependencies.todo_id and em.user_id = auth.uid()
    )
  );

create policy "Members can manage dependencies in their events"
  on public.todo_dependencies for all
  using (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      where t.id = todo_dependencies.todo_id and em.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Todo comments
-- ----------------------------------------------------------------------------
create table if not exists public.todo_comments (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.todo_comments enable row level security;

create policy "Members can view comments in their events"
  on public.todo_comments for select
  using (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      where t.id = todo_comments.todo_id and em.user_id = auth.uid()
    )
  );

create policy "Members can create comments in their events"
  on public.todo_comments for insert
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      where t.id = todo_comments.todo_id and em.user_id = auth.uid()
    )
  );

create policy "Users can update their own comments"
  on public.todo_comments for update
  using (user_id = auth.uid());

create policy "Users can delete their own comments"
  on public.todo_comments for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Pages (WYSIWYG — content stored as HTML)
-- ----------------------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  content text,
  parent_id uuid references public.pages(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.pages enable row level security;

create policy "Members can view pages in their events"
  on public.pages for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = pages.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members with can_edit_pages can create pages"
  on public.pages for insert
  with check (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = pages.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

create policy "Members with can_edit_pages can update pages"
  on public.pages for update
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = pages.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

create policy "Members with can_edit_pages can delete pages"
  on public.pages for delete
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = pages.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

-- ----------------------------------------------------------------------------
-- Shortcuts
-- ----------------------------------------------------------------------------
create table if not exists public.shortcuts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  url text not null,
  icon text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.shortcuts enable row level security;

create policy "Members can view shortcuts in their events"
  on public.shortcuts for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = shortcuts.event_id and em.user_id = auth.uid()
    )
  );

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

-- ----------------------------------------------------------------------------
-- Google Calendar tokens (per-user OAuth, encrypted)
-- ----------------------------------------------------------------------------
create table if not exists public.google_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  calendar_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.google_calendar_tokens enable row level security;

create policy "Users can view their own calendar tokens"
  on public.google_calendar_tokens for select
  using (user_id = auth.uid());

create policy "Users can insert their own calendar tokens"
  on public.google_calendar_tokens for insert
  with check (user_id = auth.uid());

create policy "Users can update their own calendar tokens"
  on public.google_calendar_tokens for update
  using (user_id = auth.uid());

create policy "Users can delete their own calendar tokens"
  on public.google_calendar_tokens for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Calendar sync state (maps todos to Google Calendar events)
-- ----------------------------------------------------------------------------
create table if not exists public.calendar_sync_state (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_event_id text,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(todo_id, user_id)
);

alter table public.calendar_sync_state enable row level security;

create policy "Users can view their own sync state"
  on public.calendar_sync_state for select
  using (user_id = auth.uid());

create policy "Users can insert their own sync state"
  on public.calendar_sync_state for insert
  with check (user_id = auth.uid());

create policy "Users can update their own sync state"
  on public.calendar_sync_state for update
  using (user_id = auth.uid());

create policy "Users can delete their own sync state"
  on public.calendar_sync_state for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Reminder log (Telegram reminders, cron-only access)
-- ----------------------------------------------------------------------------
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  days_before int not null check (days_before in (3, 1, 0)),
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed')),
  error text
);

-- ----------------------------------------------------------------------------
-- Telegram users (per-user chat ID for DM reminders)
-- ----------------------------------------------------------------------------
create table if not exists public.telegram_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id text not null,
  username text,
  updated_at timestamptz default now()
);

alter table public.telegram_users enable row level security;

create policy "Users can view their own Telegram chat ID"
  on public.telegram_users for select
  using (user_id = auth.uid());

create policy "Users can update their own Telegram chat ID"
  on public.telegram_users for update
  using (user_id = auth.uid());

create policy "Users can insert their own Telegram chat ID"
  on public.telegram_users for insert
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Telegram pending (link requests before user approval)
-- ----------------------------------------------------------------------------
create table if not exists public.telegram_pending (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  telegram_username text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

alter table public.telegram_pending enable row level security;
alter table public.telegram_pending force row level security;

create policy "Users can view their own pending Telegram requests"
  on public.telegram_pending for select
  using (auth.uid() = user_id);

create policy "Users can update their own pending Telegram requests"
  on public.telegram_pending for update
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_event_members_user on public.event_members(user_id);
create index if not exists idx_event_members_event on public.event_members(event_id);
create index if not exists idx_roles_event on public.roles(event_id);
create index if not exists idx_todos_event_status on public.todos(event_id, status);
create index if not exists idx_todos_assigned on public.todos(assigned_to);
create index if not exists idx_todos_due_date on public.todos(due_date);
create index if not exists idx_todo_deps_todo on public.todo_dependencies(todo_id);
create index if not exists idx_todo_deps_depends on public.todo_dependencies(depends_on_todo_id);
create index if not exists idx_todo_comments_todo on public.todo_comments(todo_id);
create index if not exists idx_todo_assignees_todo on public.todo_assignees(todo_id);
create index if not exists idx_todo_assignees_user on public.todo_assignees(user_id);
create index if not exists idx_pages_event on public.pages(event_id);
create index if not exists idx_pages_parent on public.pages(parent_id);
create index if not exists idx_shortcuts_event on public.shortcuts(event_id);
create index if not exists idx_calendar_tokens_user on public.google_calendar_tokens(user_id);
create index if not exists idx_calendar_sync_state_user on public.calendar_sync_state(user_id);
create index if not exists idx_calendar_sync_state_todo on public.calendar_sync_state(todo_id);
create index if not exists idx_reminder_log_todo_days on public.reminder_log(todo_id, days_before);
create index if not exists idx_reminder_log_event on public.reminder_log(event_id);

-- ----------------------------------------------------------------------------
-- Reload schema cache
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';