-- Add content column to pages for WYSIWYG editor (replaces block-based approach)
alter table public.pages
  add column if not exists content text;

-- Backfill: migrate existing page_blocks content into pages.content as HTML
-- (best-effort one-time migration; left as nullable since old pages may
--  have blocks that are rendered separately)