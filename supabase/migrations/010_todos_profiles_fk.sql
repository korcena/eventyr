-- Add foreign key from todos.assigned_to to profiles.id
-- This allows Supabase to resolve the profiles!assigned_to join
alter table public.todos
  drop constraint if exists todos_assigned_to_fkey;

alter table public.todos
  add constraint todos_assigned_to_fkey
  foreign key (assigned_to) references public.profiles(id)
  on delete set null;