import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

interface TelegramUpdate {
  message?: {
    chat?: { id: number; username?: string };
    text?: string;
  };
}

interface PendingState {
  chat_id: string;
  step: "awaiting_email";
}

// Simple in-memory state per chat (resets on server restart)
// For production, this could be stored in a DB table, but for a bot
// with low traffic this is fine
const chatStates = new Map<string, PendingState>();

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = update.message;
  if (!msg?.chat || !msg.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(msg.chat.id);
  const username = msg.chat.username ?? "";
  const text = msg.text.trim();

  async function reply(text: string) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  }

  // /start command
  if (text.toLowerCase() === "/start") {
    chatStates.set(chatId, { chat_id: chatId, step: "awaiting_email" });
    await reply(
      "Welcome to Eventyr Reminders! 🎉\n\n" +
      "To link your Telegram to your Eventyr account, please send your *email address* " +
      "that you use to log in to Eventyr."
    );
    return NextResponse.json({ ok: true });
  }

  // /cancel command
  if (text.toLowerCase() === "/cancel") {
    chatStates.delete(chatId);
    await reply("Cancelled. Send /start to try again.");
    return NextResponse.json({ ok: true });
  }

  // If we're awaiting an email
  const state = chatStates.get(chatId);
  if (state?.step === "awaiting_email") {
    const email = text.toLowerCase();

    // Basic email validation
    if (!email.includes("@") || !email.includes(".")) {
      await reply("That doesn't look like an email address. Please send your email, or /cancel.");
      return NextResponse.json({ ok: true });
    }

    // Check if the email exists in our system
    const supabase = createAdminClient();

    // Look up the user by email via the admin API
    const { data: userData, error: userError } = await supabase.auth.admin
      .listUsers();

    if (userError || !userData) {
      await reply("Something went wrong. Please try again or /cancel.");
      return NextResponse.json({ ok: true });
    }

    const matchingUser = userData.users.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (!matchingUser) {
      await reply(
        `No Eventyr account found for *${email}*.\n\n` +
        "Make sure you use the same email you log in with. Try again or /cancel."
      );
      return NextResponse.json({ ok: true });
    }

    // Check if this chat_id is already linked
    const { data: existing } = await supabase
      .from("telegram_users")
      .select("user_id")
      .eq("user_id", matchingUser.id)
      .single();

    if (existing) {
      await reply("This account is already linked to a Telegram chat. Use /start to link a new one.");
      chatStates.delete(chatId);
      return NextResponse.json({ ok: true });
    }

    // Create a pending request
    await supabase.from("telegram_pending").insert({
      user_id: matchingUser.id,
      chat_id: chatId,
      email: matchingUser.email!,
      telegram_username: username,
      status: "pending",
    });

    chatStates.delete(chatId);

    await reply(
      "✅ Almost done!\n\n" +
      "A pending connection has been created. Go to *Settings → Telegram* in Eventyr and click *Approve* to activate reminders.\n\n" +
      `Linked email: *${matchingUser.email}*`
    );

    return NextResponse.json({ ok: true });
  }

  // Unknown message
  await reply("Send /start to connect your Eventyr account.");
  return NextResponse.json({ ok: true });
}