import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Citation {
  sourceType: string;
  sourceId: string;
  eventId: string;
  snippet: string;
  similarity: number;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  pending?: boolean;
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dim text-accent">
          <Sparkles size={16} />
        </div>
      )}

      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-accent text-white rounded-br-sm"
              : "bg-bg-tertiary text-text-primary border border-border rounded-bl-sm",
          )}
        >
          {message.content}
          {message.pending && (
            <span className="ml-1 inline-flex items-center gap-1 align-middle">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </span>
          )}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <span
                key={`${c.sourceType}-${c.sourceId}-${i}`}
                className="inline-flex items-center rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-[11px] text-text-secondary"
                title={c.snippet}
              >
                {c.sourceType}:{c.sourceId.slice(0, 6)}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary border border-border">
          <User size={16} />
        </div>
      )}
    </div>
  );
}