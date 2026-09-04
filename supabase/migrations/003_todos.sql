-- Todos table
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Todo dependencies table
create table if not exists public.todo_dependencies (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  depends_on_todo_id uuid not null references public.todos(id) on delete cascade,
  unique(todo_id, depends_on_todo_id),
  check (todo_id != depends_on_todo_id)
);

-- Todo comments table
create table if not exists public.todo_comments (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references public.todos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.todos enable row level security;
alter table public.todo_dependencies enable row level security;
alter table public.todo_comments enable row level security;

-- Todos policies
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

-- Dependencies policies
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

-- Comments policies
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

-- Indexes
create index idx_todos_event_status on public.todos(event_id, status);
create index idx_todos_assigned on public.todos(assigned_to);
create index idx_todos_due_date on public.todos(due_date);
create index idx_todo_deps_todo on public.todo_dependencies(todo_id);
create index idx_todo_deps_depends on public.todo_dependencies(depends_on_todo_id);
create index idx_todo_comments_todo on public.todo_comments(todo_id);