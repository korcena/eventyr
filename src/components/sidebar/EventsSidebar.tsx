"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/actions";

interface SidebarEvent {
  id: string;
  name: string;
  type: string;
}

interface SidebarUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export function EventsSidebar({ events, user }: { events: SidebarEvent[]; user: SidebarUser }) {
  const pathname = usePathname();

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <aside className="flex w-[220px] flex-col border-r border-border bg-bg-secondary px-2.5 py-3">
      <Link href="/app" className="mb-4 flex items-center gap-1.5 px-1">
        <span className="flex items-center justify-center rounded bg-accent text-xs font-extrabold text-white" style={{ width: 24, height: 24 }}>
          E
        </span>
        <span className="text-base font-bold text-text-primary">Eventyr</span>
      </Link>

      <div className="mb-1 px-1">
        <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
          Your Events
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {events.length === 0 ? (
          <p className="px-1 py-2 text-xs text-text-tertiary">
            No events yet. Create one to get started.
          </p>
        ) : (
          events.map((event) => {
            const isActive = pathname?.startsWith(`/app/events/${event.id}`);
            return (
              <Link
                key={event.id}
                href={`/app/events/${event.id}`}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-bg-tertiary font-medium text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {event.name}
              </Link>
            );
          })
        )}
      </nav>

      <div className="mt-auto border-t border-border pt-2">
        <Link
          href="/app/chat"
          className={cn(
            "mb-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
            pathname === "/app/chat"
              ? "bg-bg-tertiary font-medium text-accent"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          AI Chat
        </Link>
        <Link
          href="/app/settings"
          className={cn(
            "mb-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
            pathname === "/app/settings"
              ? "bg-bg-tertiary font-medium text-accent"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Settings
        </Link>
        <form action={logout} className="flex items-center gap-2 px-1 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#333] text-xs text-text-secondary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-text-primary">{user.displayName}</div>
            <div className="truncate text-xs text-text-tertiary">{user.email}</div>
          </div>
          <button
            type="submit"
            className="text-xs text-text-tertiary hover:text-text-secondary"
            title="Log out"
          >
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}