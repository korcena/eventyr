import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = (update as { message?: { chat?: { id: number; username?: string }; text?: string } }).message;
  if (!msg?.chat || !msg.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(msg.chat.id);
  const username = msg.chat.username ?? "";

  const text = msg.text.toLowerCase().trim();
  if (text === "/start" || text === "/getchatid" || text.startsWith("/getchatid")) {
    let reply: string;

    if (text === "/start") {
      reply =
        `Welcome to Eventyr Reminders! 🎉\n\n` +
        `Your Chat ID is: \`${chatId}\`\n\n` +
        `Copy this ID and paste it into your profile settings in Eventyr to receive todo reminders.`;
    } else {
      reply = `Your Chat ID is: \`${chatId}\``;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: "Markdown",
      }),
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}