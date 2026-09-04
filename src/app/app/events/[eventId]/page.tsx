import { getTodos } from "@/lib/actions/todos";
import { getPages } from "@/lib/actions/pages";
import { getShortcuts } from "@/lib/actions/shortcuts";
import { getMembers } from "@/lib/actions/members";
import { daysLeft, formatDaysLeft, STATUS_LABELS, type TodoStatus } from "@/lib/todo-status";
import { Card } from "@/components/ui";
import Link from "next/link";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [todos, pages, shortcuts, members] = await Promise.all([
    getTodos(eventId),
    getPages(eventId),
    getShortcuts(eventId),
    getMembers(eventId),
  ]);

  const stats: Record<TodoStatus, number> = {
    not_started: 0,
    in_progress: 0,
    blocked: 0,
    completed: 0,
  };
  let overdue = 0;
  for (const todo of todos) {
    stats[todo.status]++;
    const days = daysLeft(todo.due_date);
    if (days !== null && days < 0 && todo.status !== "completed") overdue++;
  }

  const upcoming = todos
    .filter((t) => t.status !== "completed" && t.due_date)
    .slice(0, 5);

  const total = todos.length;
  const pieSegments = [
    { label: "Open", value: stats.not_started + stats.in_progress, color: "#4F8DF7" },
    { label: "Blocked", value: stats.blocked, color: "#F59E0B" },
    { label: "Overdue", value: overdue, color: "#EF4444" },
    { label: "Done", value: stats.completed, color: "#22C55E" },
  ];
  const circumference = 2 * Math.PI * 40;
  let offset = 0;

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-3">
        {/* Todo Stats with pie chart */}
        <Card className="flex flex-col gap-2.5">
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Todo Stats</p>
          <div className="flex items-center gap-3.5">
            <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1E1E1E" strokeWidth="14" />
              {pieSegments.map((seg, i) => {
                if (seg.value === 0) return null;
                const dash = (seg.value / total) * circumference;
                const circle = (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="14"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return circle;
              })}
            </svg>
            <div className="flex flex-col gap-1.5 text-[11px]">
              {pieSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} />
                  <span className="font-semibold text-text-primary">{seg.value}</span>
                  <span className="text-text-tertiary">{seg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Upcoming Due */}
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Upcoming Due</p>
          {upcoming.length > 0 ? (
            <div className="space-y-1">
              {upcoming.map((todo) => {
                const days = daysLeft(todo.due_date);
                return (
                  <Link
                    key={todo.id}
                    href={`/app/events/${eventId}/todos/${todo.id}`}
                    className="block text-xs text-text-secondary hover:text-text-primary"
                  >
                    {todo.title} — {formatDaysLeft(days)}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">Nothing due.</p>
          )}
        </Card>

        {/* Quick Links */}
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Quick Links</p>
          {shortcuts.length > 0 ? (
            <div className="space-y-1">
              {shortcuts.slice(0, 5).map((sc) => (
                <a
                  key={sc.id}
                  href={sc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-accent hover:underline"
                >
                  {sc.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No shortcuts yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Recent Pages</p>
          {pages.length > 0 ? (
            <div className="space-y-1">
              {pages.slice(0, 5).map((page) => (
                <Link
                  key={page.id}
                  href={`/app/events/${eventId}/pages/${page.id}`}
                  className="block text-xs text-text-secondary hover:text-text-primary"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No pages yet.</p>
          )}
        </Card>

        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Members</p>
          {members.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const initials = m.profile?.display_name
                  ? m.profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                  : "??";
                return (
                  <div key={m.id} className="flex items-center gap-1 text-[11px] text-text-secondary">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#333] text-[9px]">
                      {initials}
                    </div>
                    {m.profile?.display_name ?? "Unknown"}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">No members.</p>
          )}
        </Card>
      </div>
    </div>
  );
}