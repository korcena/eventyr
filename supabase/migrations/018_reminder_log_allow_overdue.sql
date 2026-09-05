-- Allow days_before = 0 for overdue reminders
alter table public.reminder_log drop constraint if exists reminder_log_days_before_check;
alter table public.reminder_log add constraint reminder_log_days_before_check check (days_before in (3, 1, 0));