import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export type SourceType = "todo" | "page" | "page_block" | "shortcut";

function getEmbeddingClient() {
  const baseURL = process.env.OLLAMA_BASE_URL;
  const apiKey = process.env.OLLAMA_API_KEY ?? "ollama";
  if (!baseURL) {
    throw new Error("OLLAMA_BASE_URL is not configured");
  }
  return new OpenAI({ baseURL, apiKey });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
  const client = getEmbeddingClient();
  const response = await client.embeddings.create({
    model,
    input: text,
  });
  return response.data[0].embedding as unknown as number[];
}

export async function indexContent(
  eventId: string,
  sourceType: SourceType,
  sourceId: string,
  content: string,
): Promise<void> {
  if (!content.trim()) {
    await removeIndex(sourceType, sourceId);
    return;
  }

  const embedding = await generateEmbedding(content);
  const supabase = await createClient();

  const { error } = await supabase
    .from("ai_embeddings")
    .upsert(
      {
        event_id: eventId,
        source_type: sourceType,
        source_id: sourceId,
        content,
        embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_type,source_id" },
    );

  if (error) {
    console.error("[embeddings] Failed to index content:", error.message);
  }
}

export async function removeIndex(
  sourceType: SourceType,
  sourceId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_embeddings")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);

  if (error) {
    console.error("[embeddings] Failed to remove index:", error.message);
  }
}