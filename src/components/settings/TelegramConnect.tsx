"use client";

import { useState, useTransition } from "react";
import { Card, Button, Input } from "@/components/ui";
import { saveTelegramChatId, removeTelegramChatId, sendTestDM } from "@/lib/actions/telegram-user";

export function TelegramConnect({
  chatId,
  botUsername,
}: {
  chatId: string | null;
  botUsername: string | null;
}) {
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(!!chatId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const botUrl = botUsername
    ? `https://t.me/${botUsername}`
    : "https://t.me/";

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-text-primary">Telegram Reminders</h3>
      <p className="mb-3 text-xs text-text-tertiary">
        Get a DM 3 and 1 day before each todo assigned to you is due.
      </p>

      {!connected ? (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-bg-tertiary px-3 py-2.5 text-xs text-text-secondary">
            <p className="mb-2 font-medium text-text-primary">How to connect:</p>
            <ol className="ml-4 list-decimal space-y-1">
              <li>
                Message{" "}
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  {botUsername ? `@${botUsername}` : "our bot"}
                </a>{" "}
                on Telegram
              </li>
              <li>Send <code className="rounded bg-bg-primary px-1 py-0.5 text-accent">/getChatId</code></li>
              <li>Copy the Chat ID from the reply</li>
              <li>Paste it below and click Connect</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. 123456789"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              size="sm"
              disabled={pending || !input.trim()}
              onClick={() => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  const res = await saveTelegramChatId(input);
                  if (res.error) setError(res.error);
                  else {
                    setConnected(true);
                    setSuccess("Connected!");
                  }
                });
              }}
            >
              {pending ? "Connecting…" : "Connect"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            Connected — Chat ID: {chatId}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  const res = await sendTestDM();
                  if (res.error) setError(res.error);
                  else setSuccess("Test message sent!");
                });
              }}
            >
              {pending ? "Sending…" : "Send Test DM"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  const res = await removeTelegramChatId();
                  if (res.error) setError(res.error);
                  else {
                    setConnected(false);
                    setInput("");
                  }
                });
              }}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      {success && <p className="mt-2 text-xs text-success">{success}</p>}
    </Card>
  );
}