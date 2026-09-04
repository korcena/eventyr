import { createClient } from "@/lib/supabase/server";
import { detectCycle } from "@/lib/cycle-detection";

export interface DependencyRow {
  id: string;
  todo_id: string;
  depends_on_todo_id: string;
  depends_on: { id: string; title: string; status: string } | null;
}

export type ActionResult = { error: string | null };

export async function getDependencies(todoId: string): Promise<DependencyRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("todo_dependencies")
    .select(`
      *,
      depends_on:todos!depends_on_todo_id(id, title, status)
    `)
    .eq("todo_id", todoId);

  return (data as DependencyRow[]) ?? [];
}

export async function getDependents(todoId: string): Promise<DependencyRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("todo_dependencies")
    .select(`
      *,
      depends_on:todos!todo_id(id, title, status)
    `)
    .eq("depends_on_todo_id", todoId);

  return (data as DependencyRow[]) ?? [];
}

export async function addDependency(todoId: string, dependsOnId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const existing = await getDependencies(todoId);
  const depsMap = new Map<string, string[]>();
  for (const dep of existing) {
    const arr = depsMap.get(dep.todo_id) ?? [];
    arr.push(dep.depends_on_todo_id);
    depsMap.set(dep.todo_id, arr);
  }

  if (detectCycle(todoId, dependsOnId, depsMap)) {
    return { error: "Cannot add: this would create a circular dependency" };
  }

  const { error } = await supabase
    .from("todo_dependencies")
    .insert({ todo_id: todoId, depends_on_todo_id: dependsOnId });

  if (error) return { error: error.message };
  return { error: null };
}

export async function removeDependency(dependencyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("todo_dependencies")
    .delete()
    .eq("id", dependencyId);

  if (error) return { error: error.message };
  return { error: null };
}