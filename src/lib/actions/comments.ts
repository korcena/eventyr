import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

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
  return { error: null };
}

export async function updateComment(commentId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("todo_comments")
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("todo_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  return { error: null };
}