"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sendMessage } from "@/lib/telegram";

export type ActionResult = { error: string | null };

export async function saveTelegramChatId(chatId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!chatId.trim()) return { error: "Chat ID is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("telegram_users")
    .upsert({
      user_id: user.id,
      chat_id: chatId.trim(),
      updated_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };
  return { error: null };
}

export async function removeTelegramChatId(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("telegram_users")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function sendTestDM(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return { error: "TELEGRAM_BOT_TOKEN env var is not set" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("telegram_users")
    .select("chat_id")
    .eq("user_id", user.id)
    .single();

  if (!data?.chat_id) return { error: "Chat ID not configured" };

  const text =
    `✅ *Test message from Eventyr*\n\n` +
    `Telegram reminders are now active! You'll receive a DM 3 and 1 day before each todo assigned to you is due.`;

  const ok = await sendMessage(botToken, data.chat_id, text);
  return ok ? { error: null } : { error: "Failed to send test message" };
}