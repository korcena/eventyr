"use client";

import { useTransition } from "react";
import { updateTodoStatus } from "@/lib/actions/todos";
import { STATUS_LABELS, type TodoStatus } from "@/lib/todo-status";
import { cn } from "@/lib/utils";

const STATUSES: TodoStatus[] = ["not_started", "in_progress", "blocked", "completed"];

export function TodoStatusChanger({
  todoId,
  currentStatus,
}: {
  todoId: string;
  currentStatus: TodoStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-1.5">
      {STATUSES.map((status) => (
        <button
          key={status}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await updateTodoStatus(todoId, status);
            })
          }
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
            currentStatus === status
              ? "border-accent text-accent"
              : "border-border text-text-tertiary hover:text-text-secondary",
          )}
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
}