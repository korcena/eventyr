-- Pages table
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  parent_id uuid references public.pages(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Page blocks table
create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null check (type in ('heading', 'text', 'list', 'table', 'organizer_list', 'prize_list')),
  content jsonb not null default '{}'::jsonb,
  position integer not null default 0
);

-- Enable RLS
alter table public.pages enable row level security;
alter table public.page_blocks enable row level security;

-- Pages policies
create policy "Members can view pages in their events"
  on public.pages for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = pages.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members with can_edit_pages can create pages"
  on public.pages for insert
  with check (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = pages.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

create policy "Members with can_edit_pages can update pages"
  on public.pages for update
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = pages.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

create policy "Members with can_edit_pages can delete pages"
  on public.pages for delete
  using (
    exists (
      select 1 from public.event_members em
      join public.roles r on r.id = em.role_id
      where em.event_id = pages.event_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

-- Page blocks policies
create policy "Members can view blocks in their events"
  on public.page_blocks for select
  using (
    exists (
      select 1 from public.page_blocks pb
      join public.pages p on p.id = pb.page_id
      join public.event_members em on em.event_id = p.event_id
      where pb.page_id = page_blocks.page_id and em.user_id = auth.uid()
    )
  );

create policy "Members with can_edit_pages can manage blocks"
  on public.page_blocks for all
  using (
    exists (
      select 1 from public.pages p
      join public.event_members em on em.event_id = p.event_id
      join public.roles r on r.id = em.role_id
      where p.id = page_blocks.page_id and em.user_id = auth.uid()
      and (r.permissions->>'can_edit_pages')::boolean
    )
  );

-- Indexes
create index idx_pages_event on public.pages(event_id);
create index idx_pages_parent on public.pages(parent_id);
create index idx_page_blocks_page on public.page_blocks(page_id);
create index idx_page_blocks_position on public.page_blocks(page_id, position);