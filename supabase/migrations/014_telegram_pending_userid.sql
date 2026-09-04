-- Add user_id to telegram_pending so RLS can match on auth.uid()
-- (querying auth.users from within a user-table RLS policy is
-- blocked by Supabase, so the previous policy silently returned
-- no rows).

alter table public.telegram_pending
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill user_id for any existing pending rows from the email
update public.telegram_pending p
  set user_id = u.id
  from auth.users u
  where lower(u.email) = lower(p.email) and p.user_id is null;

-- Drop the old email-matching policies
drop policy if exists "Users can view their own pending Telegram requests"
  on public.telegram_pending;
drop policy if exists "Users can update their own pending Telegram requests"
  on public.telegram_pending;

-- Simpler policies keyed on user_id
create policy "Users can view their own pending Telegram requests"
  on public.telegram_pending for select
  using (auth.uid() = user_id);

create policy "Users can update their own pending Telegram requests"
  on public.telegram_pending for update
  using (auth.uid() = user_id);