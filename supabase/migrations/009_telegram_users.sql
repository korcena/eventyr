-- Store per-user Telegram chat IDs
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