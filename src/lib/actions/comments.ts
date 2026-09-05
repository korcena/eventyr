"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { refresh } from "next/cache";
import { sendMessage } from "@/lib/telegram";

export interface CommentRow {
  id: string;
  todo_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: { display_name: string | null } | null;
}

export type ActionResult = { error: string | null };

export async function getComments(todoId: string): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("todo_comments")
    .select(`
      *,
      profile:profiles(display_name)
    `)
    .eq("todo_id", todoId)
    .order("created_at", { ascending: true });

  return (data as CommentRow[]) ?? [];
}

async function notifyAssigneesOfComment(
  todoId: string,
  commenterId: string,
  commentContent: string,
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  if (!botToken) return;

  const admin = createAdminClient();

  const { data: todo } = await admin
    .from("todos")
    .select("id, title, event_id, events:event_id(name)")
    .eq("id", todoId)
    .single();

  if (!todo) return;

  const { data: assignees } = await admin
    .from("todo_assignees")
    .select("user_id")
    .eq("todo_id", todoId);

  const assigneeIds = (assignees ?? []).map((a) => a.user_id).filter((id) => id !== commenterId);
  if (assigneeIds.length === 0) return;

  const { data: commenter } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", commenterId)
    .single();

  const { data: tgUsers } = await admin
    .from("telegram_users")
    .select("chat_id")
    .in("user_id", assigneeIds);

  const chatIds = (tgUsers ?? []).map((u) => u.chat_id).filter(Boolean);
  if (chatIds.length === 0) return;

  const todoUrl = `${appBaseUrl}/app/events/${todo.event_id}/todos/${todo.id}`;
  const eventName = (todo.events as unknown as { name: string } | null)?.name ?? "Unknown event";
  const commenterName = commenter?.display_name ?? "Someone";
  const text = [
    `💬 New comment on <b>${todo.title}</b>`,
    `Event: ${eventName}`,
    `${commenterName}: ${commentContent.trim()}`,
    `Open: ${todoUrl}`,
  ].join("\n");

  for (const chatId of chatIds) {
    await sendMessage(botToken, chatId, text, "HTML");
  }
}

export async function addComment(todoId: string, content: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Comment cannot be empty" };

  const supabase = await createClient();
  const { error } = await supabase.from("todo_comments").insert({
    todo_id: todoId,
    user_id: user.id,
    content: content.trim(),
  });

  if (error) return { error: error.message };

  await notifyAssigneesOfComment(todoId, user.id, content);

  refresh();
  return { error: null };
}

export async function updateComment(commentId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("todo_comments")
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("todo_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}