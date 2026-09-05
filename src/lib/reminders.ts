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
  appName: string,
  todo: DueTodo,
  daysBefore: ReminderDaysBefore,
): string {
  const todoUrl = `${appName}/app/events/${todo.event_id}/todos/${todo.id}`;
  const when = daysBefore === 1 ? "*tomorrow*" : `*in ${daysBefore} days*`;
  return [
    `⏰ *Reminder: ${todo.title}*`,
    `Event: ${todo.events?.name ?? "Unknown event"}`,
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
    console.error(`[reminders] failed to log reminder for todo ${todoId}:`, insertError.message);
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
      console.warn(`[reminders] send attempt ${attempt} failed, retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  return false;
}

export interface ReminderResult {
  sent: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
}

export async function runReminders(options?: {
  dryRun?: boolean;
}): Promise<ReminderResult> {
  const dryRun = options?.dryRun ?? false;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (dryRun) console.log("[reminders] DRY_RUN enabled — no messages will be sent");

  if (!botToken) {
    console.error("[reminders] TELEGRAM_BOT_TOKEN env var is not set");
    return { sent: 0, failed: 0, skipped: 0, dryRun };
  }

  const supabase = createAdminClient();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

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
      .gte("due_date", dueWindowStart.toISOString())
      .lt("due_date", dueWindowEnd.toISOString());

    if (error) {
      console.error(`[reminders] query failed:`, error.message);
      continue;
    }

    for (const todo of (todos ?? []) as unknown as DueTodo[]) {
      const already = await alreadySent(supabase, todo.id, daysBefore);
      if (already) {
        console.log(`[reminders] skip todo ${todo.id} (${daysBefore}d): already sent`);
        skipped++;
        continue;
      }

      if (todo.assigned_to) {
        const { data: tgUser } = await supabase
          .from("telegram_users")
          .select("chat_id")
          .eq("user_id", todo.assigned_to)
          .single();

        if (!tgUser?.chat_id) {
          console.log(`[reminders] skip todo ${todo.id}: assignee has no Telegram connected`);
          skipped++;
          continue;
        }

        const text = buildMessage(appBaseUrl, todo, daysBefore);

        if (dryRun) {
          console.log(`[reminders] DRY_RUN — would send to ${tgUser.chat_id}:`);
          console.log(text);
          continue;
        }

        const ok = await sendWithRetry(botToken, tgUser.chat_id, text);
        await logReminder(
          supabase,
          todo.id,
          todo.event_id,
          daysBefore,
          ok ? "sent" : "failed",
          ok ? null : "Telegram send failed after retries",
        );
        if (ok) sent++;
        else failed++;
        console.log(`[reminders] todo ${todo.id} (${daysBefore}d): ${ok ? "sent" : "failed"}`);
      } else {
        const { data: members } = await supabase
          .from("event_members")
          .select("user_id")
          .eq("event_id", todo.event_id);

        const userIds = (members ?? []).map((m) => m.user_id);
        if (userIds.length === 0) {
          skipped++;
          continue;
        }

        const { data: tgUsers } = await supabase
          .from("telegram_users")
          .select("chat_id")
          .in("user_id", userIds);

        const chatIds = (tgUsers ?? []).map((u) => u.chat_id).filter(Boolean);
        if (chatIds.length === 0) {
          console.log(`[reminders] skip todo ${todo.id}: no members have Telegram connected`);
          skipped++;
          continue;
        }

        const text = buildMessage(appBaseUrl, todo, daysBefore);

        if (dryRun) {
          console.log(`[reminders] DRY_RUN — would send to ${chatIds.length} members:`);
          console.log(text);
          continue;
        }

        let anyOk = false;
        for (const chatId of chatIds) {
          const ok = await sendWithRetry(botToken, chatId, text);
          if (ok) anyOk = true;
        }
        await logReminder(
          supabase,
          todo.id,
          todo.event_id,
          daysBefore,
          anyOk ? "sent" : "failed",
          anyOk ? null : "Telegram send failed for all members",
        );
        if (anyOk) sent++;
        else failed++;
        console.log(`[reminders] todo ${todo.id} (${daysBefore}d, unassigned): sent to ${chatIds.length} members`);
      }
    }
  }

  console.log(`[reminders] done — sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped, dryRun };
}