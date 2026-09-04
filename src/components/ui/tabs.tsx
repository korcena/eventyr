import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  tabs: { label: ReactNode; value: string; active?: boolean; badge?: ReactNode }[];
  onTabChange?: (value: string) => void;
}

export function Tabs({ tabs, className, onTabChange, ...props }: TabsProps) {
  return (
    <div className={cn("flex gap-0 border-b border-border px-4", className)} {...props}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange?.(tab.value)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-2.5 text-sm transition-colors",
            tab.active
              ? "border-b-2 border-accent font-medium text-text-primary"
              : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          {tab.label}
          {tab.badge}
        </button>
      ))}
    </div>
  );
}