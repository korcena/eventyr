"use client";

import { cn } from "@/lib/utils";
import type { TodoStatus } from "@/lib/todo-status";
import { STATUS_LABELS, STATUS_DOT } from "@/lib/todo-status";

export function StatusBadge({ status }: { status: TodoStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        status === "not_started" && "bg-bg-tertiary text-text-secondary",
        status === "in_progress" && "bg-accent/15 text-accent",
        status === "blocked" && "bg-warning/15 text-warning",
        status === "completed" && "bg-success/15 text-success",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}