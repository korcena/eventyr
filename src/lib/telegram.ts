export interface TelegramMessageResult {
  ok: boolean;
  error?: string;
}

export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error(`[telegram] sendMessage failed:`, data.description ?? "unknown error");
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[telegram] sendMessage threw:`, err);
    return false;
  }
}