"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { sendMessage } from "@/lib/telegram";

export type ActionResult = { error: string | null };

export async function saveTelegramConfig(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const canEdit = await hasPermission(eventId, "can_edit_event");
  if (!canEdit) return { error: "You don't have permission to edit this event" };

  const chatId = (formData.get("telegram_chat_id") as string)?.trim();

  if (!chatId) return { error: "Chat ID is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      telegram_chat_id: chatId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function sendTestMessage(eventId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const canEdit = await hasPermission(eventId, "can_edit_event");
  if (!canEdit) return { error: "You don't have permission to edit this event" };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { error: "TELEGRAM_BOT_TOKEN env var is not set" };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("name, telegram_chat_id")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };
  if (!event.telegram_chat_id) {
    return { error: "Chat ID is not configured for this event" };
  }

  const text = `✅ *Test message from Eventyr*\n\nTelegram reminders are configured for *${event.name}*. You will receive reminders 3 and 1 day before each todo's due date.`;

  const ok = await sendMessage(botToken, event.telegram_chat_id, text);
  return ok ? { error: null } : { error: "Failed to send test message" };
}