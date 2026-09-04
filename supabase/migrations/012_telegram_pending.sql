-- Pending Telegram link requests (before user approval)
create table if not exists public.telegram_pending (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  email text not null,
  telegram_username text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

alter table public.telegram_pending enable row level security;

-- Users can view pending requests matching their email
create policy "Users can view their own pending Telegram requests"
  on public.telegram_pending for select
  using (auth.uid() is not null and exists (
    select 1 from auth.users u
    where u.id = auth.uid() and lower(u.email) = lower(telegram_pending.email)
  ));

-- Users can update (approve/reject) their own pending requests
create policy "Users can update their own pending Telegram requests"
  on public.telegram_pending for update
  using (auth.uid() is not null and exists (
    select 1 from auth.users u
    where u.id = auth.uid() and lower(u.email) = lower(telegram_pending.email)
  ));

-- Anyone can insert (the webhook needs to insert without auth)
-- We'll use the service role for webhook inserts
alter table public.telegram_pending force row level security;