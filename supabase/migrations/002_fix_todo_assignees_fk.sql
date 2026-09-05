-- Fix: change todo_assignees.user_id FK from auth.users to profiles
-- This allows Supabase to resolve the profile:profiles!user_id join

alter table public.todo_assignees
  drop constraint if exists todo_assignees_user_id_fkey;

alter table public.todo_assignees
  add constraint todo_assignees_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade;

NOTIFY pgrst, 'reload schema';