-- Reminder log table for Telegram reminders (cron-only access, no RLS)
create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  days_before int not null check (days_before in (3, 1)),
  sent_at timestamptz not null default now(),
  status text not null check (status in ('sent', 'failed')),
  error text
);

-- Idempotency index: one reminder per (todo, days_before) per send window
create index idx_reminder_log_todo_days on public.reminder_log(todo_id, days_before);
create index idx_reminder_log_event on public.reminder_log(event_id);