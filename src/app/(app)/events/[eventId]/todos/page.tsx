import { getTodos, type TodoRow } from "@/lib/actions/todos";
import { getDependencies, type DependencyRow } from "@/lib/actions/dependencies";
import { getMembers } from "@/lib/actions/members";
import { hasPermission } from "@/lib/permissions";
import { TodoList } from "@/components/todo/TodoList";
import { Button } from "@/components/ui";
import Link from "next/link";

export default async function TodosPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const todos = await getTodos(eventId);
  const canCreate = await hasPermission(eventId, "can_create_todo");

  const depsMap = new Map<string, DependencyRow[]>();
  for (const todo of todos) {
    const deps = await getDependencies(todo.id);
    if (deps.length > 0) depsMap.set(todo.id, deps);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <input
            placeholder="Search todos..."
            className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        {canCreate && (
          <Link href={`/app/events/${eventId}/todos/new`}>
            <Button size="sm">+ Add Todo</Button>
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <TodoList todos={todos} eventId={eventId} dependencies={depsMap} />
      </div>
    </div>
  );
}

// Export type for reuse
export type { TodoRow };