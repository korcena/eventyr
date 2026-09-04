"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { TodoStatus } from "@/lib/todo-status";

export interface TodoRow {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TodoStatus;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee_profile?: { display_name: string | null } | null;
}

export type ActionResult = { error: string | null };

export async function getTodos(eventId: string): Promise<TodoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select(`
      *,
      assignee_profile:profiles!assigned_to(display_name)
    `)
    .eq("event_id", eventId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[getTodos] Error:", error);
  }

  return (data as TodoRow[]) ?? [];
}

export async function getTodo(todoId: string): Promise<TodoRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select(`
      *,
      assignee_profile:profiles!assigned_to(display_name)
    `)
    .eq("id", todoId)
    .maybeSingle();

  if (error) {
    console.error("[getTodo] Error:", error);
  }

  return (data as TodoRow) ?? null;
}

export async function createTodo(eventId: string, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const canCreate = await hasPermission(eventId, "can_create_todo");
  if (!canCreate) return { error: "You don't have permission to create todos" };

  const title = formData.get("title") as string;
  if (!title?.trim()) return { error: "Title is required" };

  const supabase = await createClient();

  const { error } = await supabase.from("todos").insert({
    event_id: eventId,
    title: title.trim(),
    description: formData.get("description") as string || null,
    due_date: formData.get("due_date") as string || null,
    status: "not_started" as TodoStatus,
    assigned_to: (formData.get("assigned_to") as string) || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateTodo(todoId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("todos")
    .update({
      title: formData.get("title") as string,
      description: formData.get("description") as string || null,
      due_date: formData.get("due_date") as string || null,
      assigned_to: (formData.get("assigned_to") as string) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", todoId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateTodoStatus(todoId: string, status: TodoStatus): Promise<ActionResult> {
  const supabase = await createClient();

  if (status === "completed") {
    const { data: deps } = await supabase
      .from("todo_dependencies")
      .select("depends_on_todo_id, depends_on:todos!depends_on_todo_id(status)")
      .eq("todo_id", todoId);

    if (deps) {
      for (const dep of deps) {
        const depStatus = (dep.depends_on as unknown as { status: string }).status;
        if (depStatus !== "completed") {
          return { error: "Cannot complete: dependencies are not all completed" };
        }
      }
    }
  }

  const { error } = await supabase
    .from("todos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", todoId);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteTodo(todoId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("todos").delete().eq("id", todoId);
  if (error) return { error: error.message };
  return { error: null };
}