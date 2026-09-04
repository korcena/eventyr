-- Drop AI embeddings (RAG moved to direct DB context fetch — no vector search)
-- Ollama Cloud does not provide embedding models, so we no longer use pgvector.

drop function if exists public.match_embeddings;
drop table if exists public.ai_embeddings;