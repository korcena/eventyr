"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export interface PageRow {
  id: string;
  event_id: string;
  title: string;
  parent_id: string | null;
  content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export async function updatePageContent(pageId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pages")
    .update({ content, updated_at: new Date().toISOString() })
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

export async function searchPages(eventId: string, query: string): Promise<{ page: PageRow; snippet: string }[]> {
  const supabase = await createClient();
  const pages = await getPages(eventId);
  const results: { page: PageRow; snippet: string }[] = [];
  const q = query.toLowerCase();

  for (const page of pages) {
    if (page.title.toLowerCase().includes(q)) {
      results.push({ page, snippet: page.title });
      continue;
    }
    const text = (page.content ?? "").replace(/<[^>]+>/g, " ").toLowerCase();
    if (text.includes(q)) {
      const idx = text.indexOf(q);
      const start = Math.max(0, idx - 20);
      const snippet = (page.content ?? "").replace(/<[^>]+>/g, " ").slice(start, start + 60);
      results.push({ page, snippet: `...${snippet}...` });
    }
  }

  return results;
}