import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export function Dialog({ open, onClose, title, className, children, ...props }: DialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      {...props}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-lg border border-border bg-bg-secondary p-6 shadow-xl",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 text-lg font-semibold text-text-primary">{title}</h2>}
        {children}
      </div>
    </div>
  );
}