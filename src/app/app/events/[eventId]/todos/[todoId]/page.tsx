import Link from "next/link";
import { notFound } from "next/navigation";
import { getTodo } from "@/lib/actions/todos";
import { getDependencies, getDependents } from "@/lib/actions/dependencies";
import { getComments } from "@/lib/actions/comments";
import { getMembers } from "@/lib/actions/members";
import { getTodos } from "@/lib/actions/todos";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/todo/StatusBadge";
import { CommentThread } from "@/components/todo/CommentThread";
import { DependencyList } from "@/components/todo/DependencyList";
import { TodoStatusChanger } from "@/components/todo/TodoStatusChanger";
import { TodoEditForm } from "@/components/todo/TodoEditForm";

export default async function TodoDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; todoId: string }>;
}) {
  const { eventId, todoId } = await params;
  const todo = await getTodo(todoId);
  if (!todo || todo.event_id !== eventId) notFound();

  const [dependencies, dependents, comments, members, allTodos, currentUser] = await Promise.all([
    getDependencies(todoId),
    getDependents(todoId),
    getComments(todoId),
    getMembers(eventId),
    getTodos(eventId),
    getCurrentUser(),
  ]);

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
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Edit Task</p>
          <TodoEditForm
            todoId={todo.id}
            eventId={eventId}
            title={todo.title}
            description={todo.description}
            dueDate={todo.due_date}
            assignees={todo.assignees ?? []}
            members={members.map((m) => ({
              id: m.id,
              user_id: m.user_id,
              profile: m.profile,
            }))}
          />
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
          <CommentThread todoId={todo.id} comments={comments} currentUserId={currentUser?.id ?? ""} />
        </Card>
      </div>
    </div>
  );
}