import { Sparkles, User, CheckSquare, FileText, Link2 } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

function citationHref(c: Citation): string | null {
  const base = `/app/events/${c.eventId}`;
  switch (c.sourceType) {
    case "todo":
      return `${base}/todos/${c.sourceId}`;
    case "page":
      return `${base}/pages/${c.sourceId}`;
    case "shortcut":
      return `${base}/shortcuts`;
    default:
      return null;
  }
}

function citationLabel(c: Citation): string {
  switch (c.sourceType) {
    case "todo":
      return "Task";
    case "page":
      return "Page";
    case "shortcut":
      return "Shortcut";
    default:
      return c.sourceType;
  }
}

function citationIcon(sourceType: string) {
  switch (sourceType) {
    case "todo":
      return <CheckSquare size={11} />;
    case "page":
      return <FileText size={11} />;
    case "shortcut":
      return <Link2 size={11} />;
    default:
      return null;
  }
}

/**
 * Convert inline [todo:id], [page:id], [shortcut:id] citation tags
 * into markdown links using the event id from the citations list.
 */
function linkifyCitations(content: string, citations?: Citation[]): string {
  if (!citations || citations.length === 0) return content;
  const byKey = new Map<string, Citation>();
  for (const c of citations) {
    byKey.set(`${c.sourceType}:${c.sourceId}`, c);
  }
  return content.replace(
    /\[(todo|page|shortcut):([0-9a-f-]+)\]/gi,
    (match, type: string, id: string) => {
      const key = `${type.toLowerCase()}:${id}`;
      const c = byKey.get(key);
      if (!c) return match;
      const href = citationHref(c);
      const label = citationLabel(c);
      return href ? `[${label}](${href})` : label;
    },
  );
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === "user";
  const rendered = isUser ? message.content : linkifyCitations(message.content, message.citations);

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
            "chat-markdown rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words",
            isUser
              ? "bg-accent text-white rounded-br-sm"
              : "bg-bg-tertiary text-text-primary border border-border rounded-bl-sm",
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered}</ReactMarkdown>
          )}
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
            {message.citations.map((c, i) => {
              const href = citationHref(c);
              const label = citationLabel(c);
              const icon = citationIcon(c.sourceType);
              const cls =
                "inline-flex items-center gap-1 rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-[11px] text-text-secondary hover:border-accent hover:text-accent transition-colors";
              if (href) {
                return (
                  <Link
                    key={`${c.sourceType}-${c.sourceId}-${i}`}
                    href={href}
                    className={cls}
                    title={c.snippet}
                  >
                    {icon}
                    {label}
                  </Link>
                );
              }
              return (
                <span
                  key={`${c.sourceType}-${c.sourceId}-${i}`}
                  className={cls}
                  title={c.snippet}
                >
                  {icon}
                  {label}
                </span>
              );
            })}
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