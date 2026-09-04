export type TodoStatus = "not_started" | "in_progress" | "blocked" | "completed";

export const STATUS_ORDER: TodoStatus[] = ["not_started", "in_progress", "blocked", "completed"];

export const STATUS_LABELS: Record<TodoStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  completed: "Completed",
};

export const STATUS_COLORS: Record<TodoStatus, string> = {
  not_started: "text-text-tertiary",
  in_progress: "text-accent",
  blocked: "text-warning",
  completed: "text-success",
};

export const STATUS_BG: Record<TodoStatus, string> = {
  not_started: "bg-bg-tertiary",
  in_progress: "bg-accent/15",
  blocked: "bg-warning/15",
  completed: "bg-success/15",
};

export const STATUS_DOT: Record<TodoStatus, string> = {
  not_started: "bg-text-tertiary",
  in_progress: "bg-accent",
  blocked: "bg-warning",
  completed: "bg-success",
};

export function daysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatDaysLeft(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Today";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} over`;
}