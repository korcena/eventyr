"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export interface PageRow {
  id: string;
  event_id: string;
  title: string;
  parent_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockRow {
  id: string;
  page_id: string;
  type: "heading" | "text" | "list" | "table" | "organizer_list" | "prize_list";
  content: Record<string, unknown>;
  position: number;
}

export type ActionResult = { error: string | null };

export async function getPages(eventId: string): Promise<PageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("event_id", eventId)
    .order("title", { ascending: true });
  return (data as PageRow[]) ?? [];
}

export async function getPage(pageId: string): Promise<PageRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .single();
  return (data as PageRow) ?? null;
}

export async function getBlocks(pageId: string): Promise<BlockRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page_id", pageId)
    .order("position", { ascending: true });
  return (data as BlockRow[]) ?? [];
}

export async function createPage(eventId: string, title: string, parentId?: string): Promise<ActionResult & { pageId?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const canEdit = await hasPermission(eventId, "can_edit_pages");
  if (!canEdit) return { error: "You don't have permission to create pages" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      event_id: eventId,
      title,
      parent_id: parentId ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, pageId: data.id };
}

export async function updatePage(pageId: string, title: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pages")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", pageId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deletePage(pageId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function addBlock(pageId: string, type: BlockRow["type"], content: Record<string, unknown>): Promise<ActionResult & { blockId?: string }> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("page_blocks")
    .select("*", { count: "exact", head: true })
    .eq("page_id", pageId);

  const position = count ?? 0;

  const { data, error } = await supabase
    .from("page_blocks")
    .insert({ page_id: pageId, type, content, position })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, blockId: data.id };
}

export async function updateBlock(blockId: string, content: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("page_blocks")
    .update({ content })
    .eq("id", blockId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteBlock(blockId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("page_blocks").delete().eq("id", blockId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function reorderBlocks(pageId: string, blockIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  for (let i = 0; i < blockIds.length; i++) {
    const { error } = await supabase
      .from("page_blocks")
      .update({ position: i })
      .eq("id", blockIds[i]);
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function searchPages(eventId: string, query: string): Promise<{ page: PageRow; snippet: string }[]> {
  const supabase = await createClient();
  const pages = await getPages(eventId);
  const results: { page: PageRow; snippet: string }[] = [];

  for (const page of pages) {
    if (page.title.toLowerCase().includes(query.toLowerCase())) {
      results.push({ page, snippet: page.title });
      continue;
    }

    const { data: blocks } = await supabase
      .from("page_blocks")
      .select("content")
      .eq("page_id", page.id);

    if (blocks) {
      for (const block of blocks) {
        const contentStr = JSON.stringify(block.content).toLowerCase();
        if (contentStr.includes(query.toLowerCase())) {
          const idx = contentStr.indexOf(query.toLowerCase());
          const start = Math.max(0, idx - 20);
          const snippet = contentStr.slice(start, start + 60);
          results.push({ page, snippet: `...${snippet}...` });
          break;
        }
      }
    }
  }

  return results;
}