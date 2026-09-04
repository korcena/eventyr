-- Enable pgvector extension
create extension if not exists vector;

-- AI embeddings table for RAG
create table if not exists public.ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  source_type text not null check (source_type in ('todo', 'page', 'page_block', 'shortcut')),
  source_id uuid not null,
  content text not null,
  embedding vector(768) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.ai_embeddings enable row level security;

-- Members can only access embeddings for events they belong to
create policy "Members can view embeddings for their events"
  on public.ai_embeddings for select
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = ai_embeddings.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members can insert embeddings for their events"
  on public.ai_embeddings for insert
  with check (
    exists (
      select 1 from public.event_members em
      where em.event_id = ai_embeddings.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members can update embeddings for their events"
  on public.ai_embeddings for update
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = ai_embeddings.event_id and em.user_id = auth.uid()
    )
  );

create policy "Members can delete embeddings for their events"
  on public.ai_embeddings for delete
  using (
    exists (
      select 1 from public.event_members em
      where em.event_id = ai_embeddings.event_id and em.user_id = auth.uid()
    )
  );

-- Indexes
create index idx_ai_embeddings_event on public.ai_embeddings(event_id);
create index idx_ai_embeddings_source on public.ai_embeddings(source_type, source_id);
create index idx_ai_embeddings_embedding on public.ai_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Cosine similarity search function (security definer so RLS is not
-- re-applied inside; membership is enforced via the filter_event_ids arg)
create or replace function public.match_embeddings(
  query_embedding vector(768),
  match_count int default 5,
  filter_event_ids uuid[] default '{}'
)
returns table (
  id uuid,
  event_id uuid,
  source_type text,
  source_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer set search_path = public
as $$
  select
    e.id,
    e.event_id,
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.ai_embeddings e
  where (cardinality(filter_event_ids) = 0 or e.event_id = any(filter_event_ids))
  order by e.embedding <=> query_embedding
  limit match_count;
$$;