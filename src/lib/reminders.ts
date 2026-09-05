import { createAdminClient } from "@/lib/supabase/admin";
import { sendMessage } from "@/lib/telegram";

interface DueTodo {
  id: string;
  event_id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to: string | null;
  events: { name: string } | null;
  assignees: { user_id: string }[];
}

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

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate).getTime() < Date.now();
}

function buildDigestMessage(
  appBaseUrl: string,
  todos: DueTodo[],
): string {
  const lines: string[] = [`You have ${todos.length} task${todos.length > 1 ? "s" : ""}`];

  todos.forEach((todo, i) => {
    const label = isOverdue(todo.due_date) ? "Overdue" : `Due on ${formatDueDate(todo.due_date)}`;
    lines.push(`${i + 1}. ${todo.title} - ${label}`);
  });

  const firstEventId = todos[0]?.event_id;
  const taskListLink = `${appBaseUrl}/app/events/${firstEventId}/todos`;
  lines.push(`\nCheck your tasks in: ${taskListLink}`);

  return lines.join("\n");
}

async function alreadySent(
  supabase: ReturnType<typeof createAdminClient>,
  todoId: string,
  reminderType: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("reminder_log")
    .select("id")
    .eq("todo_id", todoId)
    .eq("days_before", reminderType)
    .eq("status", "sent")
    .limit(1);
  return !!(data && data.length > 0);
}

async function logReminder(
  supabase: ReturnType<typeof createAdminClient>,
  todoId: string,
  eventId: string,
  reminderType: string,
  status: "sent" | "failed",
  error: string | null,
): Promise<void> {
  const { error: insertError } = await supabase.from("reminder_log").insert({
    todo_id: todoId,
    event_id: eventId,
    days_before: parseInt(reminderType, 10),
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
    const ok = await sendMessage(botToken, chatId, text, "HTML");
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

  // Fetch all incomplete todos due within 3 days (includes overdue)
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 4); // 3 days ahead + today

  const { data: allTodos, error } = await supabase
    .from("todos")
    .select(`
      id,
      title,
      due_date,
      status,
      assigned_to,
      event_id,
      events:event_id(name),
      assignees:todo_assignees(user_id)
    `)
    .neq("status", "completed")
    .lt("due_date", windowEnd.toISOString())
    .order("due_date", { ascending: true });

  if (error) {
    console.error(`[reminders] query failed:`, error.message);
    return { sent, failed, skipped, dryRun };
  }

  const todos = (allTodos ?? []) as unknown as DueTodo[];

  // Determine reminder type for each todo
  type TaggedTodo = DueTodo & { reminderType: string };
  const pending: TaggedTodo[] = [];

  for (const todo of todos) {
    const due = new Date(todo.due_date);
    const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let reminderType: string | null = null;
    if (diffDays < 0) {
      reminderType = "0"; // overdue
    } else if (diffDays === 1) {
      reminderType = "1";
    } else if (diffDays === 3) {
      reminderType = "3";
    }

    if (!reminderType) continue;

    const already = await alreadySent(supabase, todo.id, reminderType);
    if (already) {
      console.log(`[reminders] skip todo ${todo.id} (${reminderType}d): already sent`);
      skipped++;
      continue;
    }

    pending.push({ ...todo, reminderType });
  }

  if (pending.length === 0) {
    console.log(`[reminders] done — sent: 0, failed: 0, skipped: ${skipped}`);
    return { sent: 0, failed: 0, skipped, dryRun };
  }

  // Group todos by recipient chat ID
  // For assigned todos: recipient = all assignees
  // For unassigned todos: recipient = all event members
  const recipientMap = new Map<string, TaggedTodo[]>();

  for (const todo of pending) {
    const assigneeIds = todo.assignees?.map((a) => a.user_id) ?? [];

    if (assigneeIds.length > 0) {
      const { data: tgUsers } = await supabase
        .from("telegram_users")
        .select("chat_id")
        .in("user_id", assigneeIds);

      const chatIds = (tgUsers ?? []).map((u) => u.chat_id).filter(Boolean);
      if (chatIds.length === 0) {
        console.log(`[reminders] skip todo ${todo.id}: no assignees have Telegram connected`);
        skipped++;
        continue;
      }

      for (const chatId of chatIds) {
        const existing = recipientMap.get(chatId) ?? [];
        existing.push(todo);
        recipientMap.set(chatId, existing);
      }
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

      for (const chatId of chatIds) {
        const existing = recipientMap.get(chatId) ?? [];
        existing.push(todo);
        recipientMap.set(chatId, existing);
      }
    }
  }

  // Send one digest message per recipient
  for (const [chatId, recipientTodos] of recipientMap) {
    const text = buildDigestMessage(appBaseUrl, recipientTodos);

    if (dryRun) {
      console.log(`[reminders] DRY_RUN — would send to ${chatId}:`);
      console.log(text);
      continue;
    }

    const ok = await sendWithRetry(botToken, chatId, text);

    // Log each todo in the digest
    for (const todo of recipientTodos) {
      await logReminder(
        supabase,
        todo.id,
        todo.event_id,
        todo.reminderType,
        ok ? "sent" : "failed",
        ok ? null : "Telegram send failed after retries",
      );
    }

    if (ok) sent++;
    else failed++;
    console.log(`[reminders] digest sent to ${chatId}: ${ok ? "ok" : "failed"} (${recipientTodos.length} todos)`);
  }

  console.log(`[reminders] done — sent: ${sent}, failed: ${failed}, skipped: ${skipped}`);
  return { sent, failed, skipped, dryRun };
}