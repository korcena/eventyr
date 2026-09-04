"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sendMessage } from "@/lib/telegram";
import { refresh } from "next/cache";

export type ActionResult = { error: string | null };

export async function getPendingTelegram() {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("telegram_pending")
    .select("*")
    .ilike("email", user.email)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function approveTelegram(pendingId: string, chatId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  // Mark as approved
  const { error: updateError } = await supabase
    .from("telegram_pending")
    .update({ status: "approved" })
    .eq("id", pendingId);

  if (updateError) return { error: updateError.message };

  // Upsert into telegram_users
  const { error: upsertError } = await supabase
    .from("telegram_users")
    .upsert({
      user_id: user.id,
      chat_id: chatId,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) return { error: upsertError.message };

  // Send confirmation DM
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    await sendMessage(
      botToken,
      chatId,
      "✅ *Connected to Eventyr!*\n\nYou'll receive a DM 3 and 1 day before each todo assigned to you is due."
    );
  }

  refresh();
  return { error: null };
}

export async function rejectTelegram(pendingId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("telegram_pending")
    .update({ status: "rejected" })
    .eq("id", pendingId);

  if (error) return { error: error.message };

  refresh();
  return { error: null };
}

export async function removeTelegramChatId(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = await createClient();

  // Get chat_id before deleting (to notify the bot)
  const { data } = await supabase
    .from("telegram_users")
    .select("chat_id")
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase
    .from("telegram_users")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  // Send disconnection DM
  if (data?.chat_id) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      await sendMessage(
        botToken,
        data.chat_id,
        "Your Eventyr Telegram connection has been revoked. Send /start to connect again."
      );
    }
  }

  refresh();
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
    "✅ *Test message from Eventyr*\n\n" +
    "Telegram reminders are active! You'll receive a DM 3 and 1 day before each todo assigned to you is due.";

  const ok = await sendMessage(botToken, data.chat_id, text);
  return ok ? { error: null } : { error: "Failed to send test message" };
}