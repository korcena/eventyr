"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export interface RoleRow {
  id: string;
  event_id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface MemberRow {
  id: string;
  event_id: string;
  user_id: string;
  role_id: string;
  joined_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  role?: RoleRow | null;
}

export async function getRoles(eventId: string): Promise<RoleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roles")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  return (data as RoleRow[]) ?? [];
}

export async function getMembers(eventId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_members")
    .select(`
      *,
      profile:profiles(display_name, avatar_url),
      role:roles(*)
    `)
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true });
  return (data as MemberRow[]) ?? [];
}

export type ActionResult = { error: string | null };

export async function createRole(eventId: string, name: string, permissions: Record<string, boolean>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("roles").insert({
    event_id: eventId,
    name,
    permissions,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateRole(roleId: string, name: string, permissions: Record<string, boolean>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("roles")
    .update({ name, permissions })
    .eq("id", roleId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) {
    console.error("[deleteRole] Error:", error.message);
    return { error: error.message };
  }
  return { error: null };
}

export async function updateMemberRole(memberId: string, roleId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_members")
    .update({ role_id: roleId })
    .eq("id", memberId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_members").delete().eq("id", memberId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function joinEventByToken(token: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("invite_token", token)
    .single();

  if (!event) return { error: "Invalid invite link" };

  const { data: existing } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: "You are already a member of this event" };

  const { data: defaultRole } = await supabase
    .from("roles")
    .select("id")
    .eq("event_id", event.id)
    .ilike("name", "Volunteer")
    .single();

  const roleId = defaultRole?.id;
  if (!roleId) {
    const { data: firstRole } = await supabase
      .from("roles")
      .select("id")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (!firstRole) return { error: "No roles found for this event" };

    const { error } = await supabase.from("event_members").insert({
      event_id: event.id,
      user_id: user.id,
      role_id: firstRole.id,
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  const { error } = await supabase.from("event_members").insert({
    event_id: event.id,
    user_id: user.id,
    role_id: roleId,
  });
  if (error) return { error: error.message };
  return { error: null };
}