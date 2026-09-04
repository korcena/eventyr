import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export async function hasPermission(eventId: string, flag: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_members")
    .select("role:roles(permissions)")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  if (!data?.role) return false;
  const permissions = (data.role as unknown as { permissions: Record<string, boolean> }).permissions;
  return permissions?.[flag] === true;
}

export async function isEventMember(eventId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  return !!data;
}