"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Todos", href: "/todos" },
  { label: "Pages", href: "/pages" },
  { label: "Shortcuts", href: "/shortcuts" },
  { label: "Settings", href: "/settings" },
];

export function EventTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const basePath = `/app/events/${eventId}`;

  return (
    <nav className="flex gap-0 border-b border-border px-4">
      {TABS.map((tab) => {
        const href = tab.href ? `${basePath}${tab.href}` : basePath;
        const isActive =
          tab.href === ""
            ? pathname === basePath
            : pathname?.startsWith(href);

        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "px-3.5 py-2.5 text-sm transition-colors",
              isActive
                ? "border-b-2 border-accent font-medium text-text-primary"
                : "text-text-tertiary hover:text-text-secondary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}