import Link from "next/link";
import { notFound } from "next/navigation";
import { getTodo } from "@/lib/actions/todos";
import { getDependencies, getDependents } from "@/lib/actions/dependencies";
import { getComments } from "@/lib/actions/comments";
import { getMembers } from "@/lib/actions/members";
import { getTodos } from "@/lib/actions/todos";
import { daysLeft, formatDaysLeft, STATUS_LABELS } from "@/lib/todo-status";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/todo/StatusBadge";
import { CommentThread } from "@/components/todo/CommentThread";
import { DependencyList } from "@/components/todo/DependencyList";
import { TodoStatusChanger } from "@/components/todo/TodoStatusChanger";

export default async function TodoDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; todoId: string }>;
}) {
  const { eventId, todoId } = await params;
  const todo = await getTodo(todoId);
  if (!todo || todo.event_id !== eventId) notFound();

  const [dependencies, dependents, comments, members, allTodos] = await Promise.all([
    getDependencies(todoId),
    getDependents(todoId),
    getComments(todoId),
    getMembers(eventId),
    getTodos(eventId),
  ]);

  const days = daysLeft(todo.due_date);
  const availableDeps = allTodos.filter(
    (t) => t.id !== todoId && !dependencies.some((d) => d.depends_on_todo_id === t.id),
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
          <Link href={`/app/events/${eventId}`} className="hover:text-text-secondary">Hackathon 2026</Link>
          <span>/</span>
          <Link href={`/app/events/${eventId}/todos`} className="hover:text-text-secondary">Todos</Link>
          <span>/</span>
          <span className="text-text-primary">{todo.title}</span>
        </div>

        <Card>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">Task Title</p>
              <p className="text-base font-semibold text-text-primary">{todo.title}</p>
            </div>
            <StatusBadge status={todo.status} />
          </div>
          <TodoStatusChanger todoId={todo.id} currentStatus={todo.status} />
        </Card>

        <Card>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">Due Date</p>
              <p className="text-sm text-text-primary">
                {todo.due_date ? new Date(todo.due_date).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">Days Left</p>
              <p className={`text-sm ${days !== null && days < 0 ? "text-error" : "text-text-secondary"}`}>
                {formatDaysLeft(days)}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">Assigned To</p>
              <p className="text-sm text-text-primary">
                {todo.assignee_profile?.display_name ?? "Unassigned"}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">Created</p>
              <p className="text-sm text-text-secondary">
                {new Date(todo.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>

        {todo.description && (
          <Card>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-text-tertiary">Description</p>
            <p className="text-sm leading-relaxed text-text-secondary">{todo.description}</p>
          </Card>
        )}

        <Card>
          <DependencyList
            todoId={todo.id}
            dependencies={dependencies}
            dependents={dependents}
            availableDeps={availableDeps}
          />
        </Card>

        <Card>
          <CommentThread todoId={todo.id} comments={comments} />
        </Card>
      </div>
    </div>
  );
}