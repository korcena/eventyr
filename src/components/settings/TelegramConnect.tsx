"use client";

import { useState, useTransition } from "react";
import { Card, Button } from "@/components/ui";
import {
  approveTelegram,
  rejectTelegram,
  removeTelegramChatId,
  sendTestDM,
} from "@/lib/actions/telegram-user";

interface PendingRequest {
  id: string;
  chat_id: string;
  email: string;
  telegram_username: string | null;
  created_at: string;
}

export function TelegramConnect({
  chatId,
  botUsername,
  pendingRequests,
}: {
  chatId: string | null;
  botUsername: string | null;
  pendingRequests: PendingRequest[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const botUrl = botUsername
    ? `https://t.me/${botUsername}`
    : "https://t.me/";

  const connected = !!chatId;

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-text-primary">Telegram Reminders</h3>
      <p className="mb-3 text-xs text-text-tertiary">
        Get a DM 3 and 1 day before each todo assigned to you is due.
      </p>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-warning">
            Pending Connection {pendingRequests.length > 1 ? `(${pendingRequests.length})` : ""}
          </p>
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5"
            >
              <div className="text-xs text-text-secondary">
                {req.telegram_username ? `@${req.telegram_username}` : "Unknown"} wants to connect
              </div>
              <div className="mt-1 text-[10px] text-text-tertiary">
                Requested {new Date(req.created_at).toLocaleDateString()}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    startTransition(async () => {
                      const res = await approveTelegram(req.id, req.chat_id);
                      if (res.error) setError(res.error);
                      else setSuccess("Telegram connected!");
                    });
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    startTransition(async () => {
                      await rejectTelegram(req.id);
                    });
                  }}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {connected ? (
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
              variant="danger"
              disabled={pending}
              onClick={() => {
                setError(null);
                setSuccess(null);
                startTransition(async () => {
                  const res = await removeTelegramChatId();
                  if (res.error) setError(res.error);
                  else setSuccess("Disconnected.");
                });
              }}
            >
              Revoke Access
            </Button>
          </div>
        </div>
      ) : pendingRequests.length === 0 ? (
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
            <li>Send <code className="rounded bg-bg-primary px-1 py-0.5 text-accent">/start</code></li>
            <li>Reply with your Eventyr email address</li>
            <li>Come back here and click Approve</li>
          </ol>
        </div>
      ) : null}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      {success && <p className="mt-2 text-xs text-success">{success}</p>}
    </Card>
  );
}