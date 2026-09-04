import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export interface ShortcutRow {
  id: string;
  event_id: string;
  label: string;
  url: string;
  icon: string | null;
  created_by: string | null;
  created_at: string;
}

export type ActionResult = { error: string | null };

export async function getShortcuts(eventId: string): Promise<ShortcutRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shortcuts")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return (data as ShortcutRow[]) ?? [];
}

export async function createShortcut(eventId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const canManage = await hasPermission(eventId, "can_manage_shortcuts");
  if (!canManage) return { error: "You don't have permission to manage shortcuts" };

  const label = formData.get("label") as string;
  const url = formData.get("url") as string;
  if (!label?.trim()) return { error: "Label is required" };
  if (!url?.trim()) return { error: "URL is required" };

  const supabase = await createClient();

  const { error } = await supabase.from("shortcuts").insert({
    event_id: eventId,
    label: label.trim(),
    url: url.trim(),
    icon: (formData.get("icon") as string) || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateShortcut(shortcutId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: shortcut } = await supabase
    .from("shortcuts")
    .select("event_id")
    .eq("id", shortcutId)
    .single();

  if (!shortcut) return { error: "Shortcut not found" };

  const canManage = await hasPermission(shortcut.event_id, "can_manage_shortcuts");
  if (!canManage) return { error: "You don't have permission to manage shortcuts" };

  const { error } = await supabase
    .from("shortcuts")
    .update({
      label: formData.get("label") as string,
      url: formData.get("url") as string,
      icon: (formData.get("icon") as string) || null,
    })
    .eq("id", shortcutId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteShortcut(shortcutId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: shortcut } = await supabase
    .from("shortcuts")
    .select("event_id")
    .eq("id", shortcutId)
    .single();

  if (!shortcut) return { error: "Shortcut not found" };

  const canManage = await hasPermission(shortcut.event_id, "can_manage_shortcuts");
  if (!canManage) return { error: "You don't have permission to manage shortcuts" };

  const { error } = await supabase.from("shortcuts").delete().eq("id", shortcutId);

  if (error) return { error: error.message };
  return { error: null };
}