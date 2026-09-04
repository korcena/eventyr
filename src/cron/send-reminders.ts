#!/usr/bin/env tsx
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { sendMessage } from "@/lib/telegram";

type ReminderDaysBefore = 3 | 1;

interface EventConfig {
  id: string;
  name: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
}

interface DueTodo {
  id: string;
  event_id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to: string | null;
  assignee_profile: { display_name: string | null } | null;
}

const REMINDER_DAYS: ReminderDaysBefore[] = [3, 1];
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

const DRY_RUN = process.env.DRY_RUN === "true";
const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

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
  const assignee = todo.assignee_profile?.display_name ?? "Unassigned";
  const todoUrl = `${APP_BASE_URL}/app/events/${todo.event_id ?? ""}/todos/${todo.id}`;
  const when =
    daysBefore === 1 ? "*tomorrow*" : `*in ${daysBefore} days*`;
  return [
    `⏰ *Reminder: ${todo.title}*`,
    `Event: ${eventName}`,
    `Assignee: ${assignee}`,
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

async function processEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: EventConfig,
): Promise<void> {
  let botToken: string;
  try {
    botToken = decrypt(event.telegram_bot_token);
  } catch {
    console.error(`[cron] event ${event.id}: failed to decrypt bot token, skipping`);
    return;
  }

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
        assignee_profile:profiles!assigned_to(display_name)
      `)
      .eq("event_id", event.id)
      .neq("status", "completed")
      .gte("due_date", dueWindowStart.toISOString())
      .lt("due_date", dueWindowEnd.toISOString());

    if (error) {
      console.error(`[cron] event ${event.id}: query failed:`, error.message);
      continue;
    }

    for (const todo of (todos ?? []) as unknown as DueTodo[]) {
      const already = await alreadySent(supabase, todo.id, daysBefore);
      if (already) {
        console.log(`[cron] skip todo ${todo.id} (${daysBefore}d): already sent`);
        continue;
      }

      const text = buildMessage(event.name, todo, daysBefore);

      if (DRY_RUN) {
        console.log(`[cron] DRY_RUN — would send to ${event.telegram_chat_id}:`);
        console.log(text);
        continue;
      }

      const ok = await sendWithRetry(botToken, event.telegram_chat_id, text);
      await logReminder(
        supabase,
        todo.id,
        event.id,
        daysBefore,
        ok ? "sent" : "failed",
        ok ? null : "Telegram send failed after retries",
      );
      console.log(
        `[cron] todo ${todo.id} (${daysBefore}d): ${ok ? "sent" : "failed"}`,
      );
    }
  }
}

async function main(): Promise<void> {
  if (DRY_RUN) console.log("[cron] DRY_RUN enabled — no messages will be sent");

  const supabase = createAdminClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, telegram_bot_token, telegram_chat_id")
    .not("telegram_bot_token", "is", null)
    .not("telegram_chat_id", "is", null);

  if (error) {
    console.error("[cron] failed to fetch events:", error.message);
    process.exit(1);
  }

  console.log(`[cron] found ${(events as EventConfig[]).length} configured event(s)`);

  for (const event of (events as EventConfig[]) ?? []) {
    try {
      await processEvent(supabase, event);
    } catch (err) {
      console.error(`[cron] event ${event.id} threw:`, err);
    }
  }

  console.log("[cron] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[cron] fatal:", err);
  process.exit(1);
});