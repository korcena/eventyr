"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Send, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ChatMessage, type ChatMessageData, type Citation } from "./ChatMessage";
import type { EventRow } from "@/lib/actions/events";

interface ChatPanelProps {
  user: { id: string; displayName: string };
  events: EventRow[];
}

const RATE_LIMIT = 20;

export function ChatPanel({ user, events }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi ${user.displayName || "there"}! Ask me anything about your events — todos, pages, prizes, shortcuts. I'll search your event data and ground my answers in it.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [eventId, setEventId] = useState<string>("all");
  const [streaming, setStreaming] = useState(false);
  const [remaining, setRemaining] = useState(RATE_LIMIT);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Chat cleared. What would you like to know?",
      },
    ]);
    setStreaming(false);
    setError(null);
  }, []);

  const send = useCallback(async () => {
    if (!input.trim() || streaming) return;
    setError(null);

    const userMsg: ChatMessageData = {
      id: `u-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: ChatMessageData = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
      citations: [],
    };

    const history = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMsg.content,
          eventId: eventId === "all" ? undefined : eventId,
          history,
        }),
      });

      if (res.status === 429) {
        setRemaining(0);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, pending: false, content: "Rate limit reached. Please wait an hour and try again." }
              : m,
          ),
        );
        setStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const flush = () => {
        if (!buffer) return;
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          if (!frame.trim()) continue;
          const lines = frame.split("\n");
          let event = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;

          if (event === "citations") {
            try {
              const parsed = JSON.parse(dataStr) as { citations: Citation[] };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, citations: parsed.citations } : m,
                ),
              );
            } catch {}
          } else if (event === "rate") {
            try {
              const parsed = JSON.parse(dataStr) as { remaining: number; limit: number };
              setRemaining(parsed.remaining);
            } catch {}
          } else if (event === "error") {
            try {
              const parsed = JSON.parse(dataStr) as { error: string };
              setError(parsed.error);
            } catch {}
          } else {
            if (dataStr === "[DONE]") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, pending: false } : m,
                ),
              );
              return;
            }
            try {
              const parsed = JSON.parse(dataStr) as { delta?: string };
              if (parsed.delta) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.delta }
                      : m,
                  ),
                );
              }
            } catch {}
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        flush();
      }
      flush();
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Failed to fetch";
      setError(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, pending: false, content: `Sorry, something went wrong: ${message}` }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, eventId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h1 className="text-sm font-semibold text-text-primary">AI Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-auto py-1.5 text-xs"
          >
            <option value="all">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={reset} title="Reset chat">
            <RotateCcw size={14} />
            Reset
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      {error && (
        <div className="px-6 pb-1 text-xs text-error">{error}</div>
      )}

      <div className="border-t border-border px-6 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your events…"
            rows={1}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors"
            disabled={streaming}
          />
          <Button onClick={send} disabled={!input.trim() || streaming} size="md">
            <Send size={14} />
            Send
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-text-tertiary">
          <span>Press Enter to send, Shift+Enter for a newline.</span>
          <span>
            {remaining}/{RATE_LIMIT} messages left this hour
          </span>
        </div>
      </div>
    </div>
  );
}