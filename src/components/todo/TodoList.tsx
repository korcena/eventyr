import Link from "next/link";
import { StatusBadge } from "@/components/todo/StatusBadge";
import { daysLeft, formatDaysLeft } from "@/lib/todo-status";
import type { TodoRow } from "@/lib/actions/todos";
import type { DependencyRow } from "@/lib/actions/dependencies";

interface TodoListProps {
  todos: TodoRow[];
  eventId: string;
  dependencies: Map<string, DependencyRow[]>;
}

export function TodoList({ todos, eventId, dependencies }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="mb-2 text-sm text-text-secondary">No todos yet.</p>
        <p className="text-xs text-text-tertiary">Create your first task to get started.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border">
          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary w-28">
            Status
          </th>
          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Task
          </th>
          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary w-24">
            Assigned To
          </th>
          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary w-20">
            Due Date
          </th>
          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary w-20">
            Days Left
          </th>
          <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-tertiary w-28">
            Dependencies
          </th>
        </tr>
      </thead>
      <tbody>
        {todos.map((todo) => {
          const days = daysLeft(todo.due_date);
          const deps = dependencies.get(todo.id) ?? [];
          const blockers = deps.filter(
            (d) => d.depends_on?.status !== "completed",
          );

          return (
            <tr
              key={todo.id}
              className="cursor-pointer border-b border-border transition-colors hover:bg-bg-tertiary/50"
              style={todo.status === "completed" ? { opacity: 0.5 } : undefined}
            >
              <td className="px-2.5 py-2.5">
                <Link href={`/app/events/${eventId}/todos/${todo.id}`}>
                  <StatusBadge status={todo.status} />
                </Link>
              </td>
              <td className="px-2.5 py-2.5">
                <Link
                  href={`/app/events/${eventId}/todos/${todo.id}`}
                  className={
                    todo.status === "completed"
                      ? "text-text-tertiary line-through"
                      : "text-text-primary"
                  }
                >
                  {todo.title}
                </Link>
              </td>
              <td className="px-2.5 py-2.5 text-text-secondary">
                {todo.assignee_profile?.display_name ?? "—"}
              </td>
              <td className="px-2.5 py-2.5 text-text-secondary">
                {todo.due_date ? new Date(todo.due_date).toLocaleDateString() : "—"}
              </td>
              <td className="px-2.5 py-2.5">
                <span
                  className={
                    days !== null && days < 0
                      ? "font-semibold text-error"
                      : days !== null && days <= 2
                        ? "text-warning"
                        : "text-text-secondary"
                  }
                >
                  {formatDaysLeft(days)}
                </span>
              </td>
              <td className="px-2.5 py-2.5">
                {blockers.length > 0 ? (
                  <span className="text-warning">
                    ⚠ {blockers.map((b) => b.depends_on?.title).join(", ")}
                  </span>
                ) : deps.length > 0 ? (
                  <span className="text-text-tertiary">✓ resolved</span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}