#!/usr/bin/env tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram";

type ReminderDaysBefore = 3 | 1;

interface DueTodo {
  id: string;
  event_id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to: string | null;
  assignee_profile: { display_name: string | null } | null;
  events: { name: string } | null;
}

const REMINDER_DAYS: ReminderDaysBefore[] = [3, 1];
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

const DRY_RUN = process.env.DRY_RUN === "true";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function buildMessage(
  eventName: string,
  todo: DueTodo,
  daysBefore: ReminderDaysBefore,
): string {
  const todoUrl = `${APP_BASE_URL}/app/events/${todo.event_id}/todos/${todo.id}`;
  const when = daysBefore === 1 ? "*tomorrow*" : `*in ${daysBefore} days*`;
  return [
    `⏰ *Reminder: ${todo.title}*`,
    `Event: ${eventName}`,
    `Due: ${formatDueDate(todo.due_date)} (${when})`,
    `Open: ${todoUrl}`,
  ].join("\n");
}

async function alreadySent(
  supabase: ReturnType<typeof createAdminClient>,
  todoId: string,
  daysBefore: ReminderDaysBefore,
): Promise<boolean> {
  const { data } = await supabase
    .from("reminder_log")
    .select("id")
    .eq("todo_id", todoId)
    .eq("days_before", daysBefore)
    .eq("status", "sent")
    .limit(1);
  return !!(data && data.length > 0);
}

async function logReminder(
  supabase: ReturnType<typeof createAdminClient>,
  todoId: string,
  eventId: string,
  daysBefore: ReminderDaysBefore,
  status: "sent" | "failed",
  error: string | null,
): Promise<void> {
  const { error: insertError } = await supabase.from("reminder_log").insert({
    todo_id: todoId,
    event_id: eventId,
    days_before: daysBefore,
    status,
    error,
  });
  if (insertError) {
    console.error(`[cron] failed to log reminder for todo ${todoId}:`, insertError.message);
  }
}

async function sendWithRetry(
  botToken: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ok = await sendMessage(botToken, chatId, text);
    if (ok) return true;
    if (attempt < MAX_RETRIES) {
      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.warn(`[cron] send attempt ${attempt} failed, retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  return false;
}

async function main(): Promise<void> {
  if (DRY_RUN) console.log("[cron] DRY_RUN enabled — no messages will be sent");

  if (!BOT_TOKEN) {
    console.error("[cron] TELEGRAM_BOT_TOKEN env var is not set");
    process.exit(1);
  }

  const supabase = createAdminClient();

  for (const daysBefore of REMINDER_DAYS) {
    const dueWindowStart = new Date();
    dueWindowStart.setUTCHours(0, 0, 0, 0);
    dueWindowStart.setUTCDate(dueWindowStart.getUTCDate() + daysBefore);

    const dueWindowEnd = new Date(dueWindowStart);
    dueWindowEnd.setUTCDate(dueWindowEnd.getUTCDate() + 1);

    const { data: todos, error } = await supabase
      .from("todos")
      .select(`
        id,
        title,
        due_date,
        status,
        assigned_to,
        event_id,
        assignee_profile:profiles!assigned_to(display_name),
        events:event_id(name)
      `)
      .neq("status", "completed")
      .not("assigned_to", "is", null)
      .gte("due_date", dueWindowStart.toISOString())
      .lt("due_date", dueWindowEnd.toISOString());

    if (error) {
      console.error(`[cron] query failed:`, error.message);
      continue;
    }

    for (const todo of (todos ?? []) as unknown as DueTodo[]) {
      const already = await alreadySent(supabase, todo.id, daysBefore);
      if (already) {
        console.log(`[cron] skip todo ${todo.id} (${daysBefore}d): already sent`);
        continue;
      }

      const eventName = todo.events?.name ?? "Unknown event";

      // Get the assignee's Telegram chat ID
      const { data: tgUser } = await supabase
        .from("telegram_users")
        .select("chat_id")
        .eq("user_id", todo.assigned_to)
        .single();

      if (!tgUser?.chat_id) {
        console.log(`[cron] skip todo ${todo.id}: assignee has no Telegram connected`);
        continue;
      }

      const text = buildMessage(eventName, todo, daysBefore);

      if (DRY_RUN) {
        console.log(`[cron] DRY_RUN — would send to ${tgUser.chat_id}:`);
        console.log(text);
        continue;
      }

      const ok = await sendWithRetry(BOT_TOKEN, tgUser.chat_id, text);
      await logReminder(
        supabase,
        todo.id,
        todo.event_id,
        daysBefore,
        ok ? "sent" : "failed",
        ok ? null : "Telegram send failed after retries",
      );
      console.log(
        `[cron] todo ${todo.id} (${daysBefore}d): ${ok ? "sent" : "failed"}`,
      );
    }
  }

  console.log("[cron] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[cron] fatal:", err);
  process.exit(1);
});