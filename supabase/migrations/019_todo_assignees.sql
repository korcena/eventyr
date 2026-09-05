-- Create todo_assignees junction table for multiple assignees
create table if not exists public.todo_assignees (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(todo_id, user_id)
);

alter table public.todo_assignees enable row level security;

-- Users can view assignees for todos they can access via event membership
create policy "Members can view todo assignees"
  on public.todo_assignees for select
  using (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      where t.id = todo_id and em.user_id = auth.uid()
    )
  );

-- Users who can create todos can assign people
create policy "Can insert todo assignees"
  on public.todo_assignees for insert
  using (
    exists (
      select 1 from public.todos t
      join public.event_members em on em.event_id = t.event_id
      join public.roles r on r.id = em.role_id
      where t.id = todo_id and em.user_id = auth.uid()
      and (r.permissions->>'can_create_todo')::boolean
    )
  );

-- Users who can create todos can remove assignees
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

create index idx_todo_assignees_todo on public.todo_assignees(todo_id);
create index idx_todo_assignees_user on public.todo_assignees(user_id);

-- Backfill: migrate existing assigned_to values into the junction table
insert into public.todo_assignees (todo_id, user_id)
select id, assigned_to from public.todos
where assigned_to is not null
on conflict (todo_id, user_id) do nothing;