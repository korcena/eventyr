"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";
import { saveTelegramConfig, sendTestMessage } from "@/lib/actions/telegram";

export function TelegramConfig({
  eventId,
  configured: initialConfigured,
}: {
  eventId: string;
  configured: boolean;
}) {
  const [configured, setConfigured] = useState(initialConfigured);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave(formData: FormData) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await saveTelegramConfig(eventId, formData);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConfigured(true);
    setSuccess("Saved.");
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setSuccess(null);
    const res = await sendTestMessage(eventId);
    setTesting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccess("Test message sent.");
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Telegram Reminders</h3>
        {configured && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
            Configured
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-text-tertiary">
        Configure bot to send reminders 3 and 1 day before due dates.
      </p>
      <form action={handleSave} className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">
            Bot Token
          </label>
          <input
            name="telegram_bot_token"
            type="password"
            placeholder={configured ? "••••••••••••" : "123456:ABC-DEF..."}
            className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">
            Chat ID
          </label>
          <input
            name="telegram_chat_id"
            placeholder="-1001234567890"
            className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="col-span-2 flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={testing || !configured}
            onClick={handleTest}
          >
            {testing ? "Sending…" : "Send Test Message"}
          </Button>
        </div>
      </form>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
      {success && <p className="mt-2 text-xs text-success">{success}</p>}
    </Card>
  );
}