-- Google Calendar tokens table (per-user OAuth credentials, encrypted)
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

-- Calendar sync state table (maps todos to Google Calendar events)
create table if not exists public.calendar_sync_state (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_event_id text,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(todo_id, user_id)
);

-- Enable RLS
alter table public.google_calendar_tokens enable row level security;
alter table public.calendar_sync_state enable row level security;

-- Tokens policies: users can only access their own tokens
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

-- Sync state policies: users can only access their own sync state
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

-- Indexes
create index idx_calendar_tokens_user on public.google_calendar_tokens(user_id);
create index idx_calendar_sync_state_user on public.calendar_sync_state(user_id);
create index idx_calendar_sync_state_todo on public.calendar_sync_state(todo_id);