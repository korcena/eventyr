import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export interface RagChunk {
  id: string;
  eventId: string;
  sourceType: string;
  sourceId: string;
  content: string;
  similarity: number;
}

export async function searchRelevantContent(
  userId: string,
  query: string,
  topK = 5,
  eventIdFilter?: string,
): Promise<RagChunk[]> {
  if (!query.trim()) return [];

  const queryEmbedding = await generateEmbedding(query);
  const supabase = await createClient();

  // Resolve the set of events the user belongs to
  let eventIds: string[] = [];
  if (eventIdFilter) {
    // Verify membership of the scoped event
    const { data: membership } = await supabase
      .from("event_members")
      .select("event_id")
      .eq("user_id", userId)
      .eq("event_id", eventIdFilter)
      .maybeSingle();
    if (!membership) return [];
    eventIds = [eventIdFilter];
  } else {
    const { data: memberships } = await supabase
      .from("event_members")
      .select("event_id")
      .eq("user_id", userId);
    eventIds = (memberships ?? []).map((m) => m.event_id);
  }

  if (eventIds.length === 0) return [];

  // Run cosine similarity search via pgvector <=> operator.
  // Supabase JS client supports RPC for raw SQL functions; here we rely on
  // a direct query using the `embedding` match via an rpc defined inline is
  // not available, so we use the filter+match approach with the vector.
  // We use supabase rpc by defining the match inline through `.rpc` is not
  // possible without a stored function. Instead, we filter by event_ids and
  // let pgvector similarity search via the `embedding` column ordering.
  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter_event_ids: eventIds,
  });

  if (error) {
    console.error("[rag] match_embeddings RPC failed:", error.message);
    return [];
  }

  return (data ?? []).map(
    (row: {
      id: string;
      event_id: string;
      source_type: string;
      source_id: string;
      content: string;
      similarity: number;
    }) => ({
      id: row.id,
      eventId: row.event_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      content: row.content,
      similarity: row.similarity,
    }),
  );
}