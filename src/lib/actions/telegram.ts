"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { encrypt, decrypt } from "@/lib/crypto";
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

  const botToken = (formData.get("telegram_bot_token") as string)?.trim();
  const chatId = (formData.get("telegram_chat_id") as string)?.trim();

  if (!botToken) return { error: "Bot token is required" };
  if (!chatId) return { error: "Chat ID is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      telegram_bot_token: encrypt(botToken),
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

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("name, telegram_bot_token, telegram_chat_id")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };
  if (!event.telegram_bot_token || !event.telegram_chat_id) {
    return { error: "Telegram is not configured for this event" };
  }

  let botToken: string;
  try {
    botToken = decrypt(event.telegram_bot_token);
  } catch {
    return { error: "Failed to decrypt bot token" };
  }

  const text = `✅ *Test message from Eventyr*\n\nTelegram reminders are configured for *${event.name}*. You will receive reminders 3 and 1 day before each todo's due date.`;

  const ok = await sendMessage(botToken, event.telegram_chat_id, text);
  return ok ? { error: null } : { error: "Failed to send test message" };
}