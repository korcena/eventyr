import { createClient } from "@/lib/supabase/server";

export interface ContextChunk {
  id: string;
  eventId: string;
  sourceType: "todo" | "page" | "shortcut";
  sourceId: string;
  content: string;
}

/**
 * Fetches relevant context directly from the database (no embeddings).
 * If eventIdFilter is provided, only that event's data is returned.
 * Otherwise, returns a summary across all the user's events (capped to
 * keep the system prompt small).
 */
export async function fetchContext(
  userId: string,
  query: string,
  eventIdFilter?: string,
): Promise<ContextChunk[]> {
  const supabase = await createClient();

  // Resolve the set of events the user belongs to
  let eventIds: string[] = [];
  if (eventIdFilter) {
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

  const chunks: ContextChunk[] = [];

  // Fetch todos (title + description + status + due date)
  const { data: todos } = await supabase
    .from("todos")
    .select("id, event_id, title, description, status, due_date")
    .in("event_id", eventIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(40);

  for (const t of todos ?? []) {
    const lines = [
      `Title: ${t.title}`,
      t.description ? `Description: ${t.description}` : null,
      `Status: ${t.status}`,
      t.due_date ? `Due: ${new Date(t.due_date).toLocaleDateString()}` : null,
    ].filter(Boolean);
    chunks.push({
      id: t.id,
      eventId: t.event_id,
      sourceType: "todo",
      sourceId: t.id,
      content: lines.join("\n"),
    });
  }

  // Fetch pages with their blocks
  const { data: pages } = await supabase
    .from("pages")
    .select("id, event_id, title")
    .in("event_id", eventIds)
    .order("title", { ascending: true })
    .limit(20);

  if (pages && pages.length > 0) {
    const pageIds = pages.map((p) => p.id);
    const { data: blocks } = await supabase
      .from("page_blocks")
      .select("id, page_id, type, content, position")
      .in("page_id", pageIds)
      .order("position", { ascending: true });

    const blocksByPage = new Map<string, typeof blocks>();
    for (const b of blocks ?? []) {
      const arr = blocksByPage.get(b.page_id) ?? [];
      arr.push(b);
      blocksByPage.set(b.page_id, arr);
    }

    for (const p of pages) {
      const pageBlocks = blocksByPage.get(p.id) ?? [];
      const blockTexts = pageBlocks.map((b) => {
        const c = b.content as Record<string, unknown>;
        // Best-effort text extraction from common block shapes
        const text =
          (typeof c.text === "string" && c.text) ||
          (typeof c.heading === "string" && c.heading) ||
          (Array.isArray(c.items) ? c.items.join(", ") : "") ||
          JSON.stringify(c);
        return `[${b.type}] ${text}`;
      });
      chunks.push({
        id: p.id,
        eventId: p.event_id,
        sourceType: "page",
        sourceId: p.id,
        content: `Page: ${p.title}\n${blockTexts.join("\n")}`,
      });
    }
  }

  // Fetch shortcuts
  const { data: shortcuts } = await supabase
    .from("shortcuts")
    .select("id, event_id, label, url, icon")
    .in("event_id", eventIds)
    .order("label", { ascending: true })
    .limit(30);

  for (const s of shortcuts ?? []) {
    chunks.push({
      id: s.id,
      eventId: s.event_id,
      sourceType: "shortcut",
      sourceId: s.id,
      content: `Shortcut: ${s.label} -> ${s.url}${s.icon ? ` (icon: ${s.icon})` : ""}`,
    });
  }

  return chunks;
}