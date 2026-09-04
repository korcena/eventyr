import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

export type EventType = "hackathon" | "workshop" | "social" | "other";

export interface EventRow {
  id: string;
  name: string;
  description: string | null;
  type: EventType;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  invite_token: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
}

export async function getEventsForUser(): Promise<EventRow[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from("event_members")
    .select("event_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [];

  const eventIds = memberships.map((m) => m.event_id);
  const { data } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .order("created_at", { ascending: false });

  return (data as EventRow[]) ?? [];
}

export async function getEvent(eventId: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();
  return (data as EventRow) ?? null;
}

export type ActionResult = { error: string | null };

export async function createEvent(prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name || name.trim().length === 0) return { error: "Event name is required" };

  const supabase = await createClient();
  const inviteToken = randomBytes(24).toString("hex");

  const { error } = await supabase.from("events").insert({
    name: name.trim(),
    description: formData.get("description") as string,
    type: formData.get("type") as EventType,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    created_by: user.id,
    invite_token: inviteToken,
  });

  if (error) return { error: error.message };

  redirect("/app");
  return { error: null };
}

export async function updateEvent(eventId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("events")
    .update({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as EventType,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("events").delete().eq("id", eventId).eq("created_by", user.id);
  if (error) return { error: error.message };

  redirect("/app");
  return { error: null };
}

export async function regenerateInviteToken(eventId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const newToken = randomBytes(24).toString("hex");

  const { error } = await supabase
    .from("events")
    .update({ invite_token: newToken })
    .eq("id", eventId);

  if (error) return { error: error.message };
  return { error: null };
}

import { redirect } from "next/navigation";