import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Color = "default" | "accent" | "success" | "warning" | "error" | "purple";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: Color;
}

const colors: Record<Color, string> = {
  default: "bg-bg-tertiary text-text-secondary",
  accent: "bg-accent-dim text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  purple: "bg-purple/15 text-purple",
};

export function Badge({ className, color = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        colors[color],
        className,
      )}
      {...props}
    />
  );
}