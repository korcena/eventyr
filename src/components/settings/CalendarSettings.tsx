"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Select } from "@/components/ui";

interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
}

export function CalendarSettings({
  eventId,
  connected: initialConnected,
  calendarId: initialCalendarId,
}: {
  eventId: string;
  connected: boolean;
  calendarId: string | null;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(initialConnected);
  const [calendarId, setCalendarId] = useState(initialCalendarId);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [loadingList, setLoadingList] = useState(initialConnected);
  const [manualId, setManualId] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(!initialCalendarId && initialConnected);

  useEffect(() => {
    if (!connected) return;
    let active = true;
    fetch("/api/calendar/list")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.calendars) setCalendars(data.calendars);
        if (data.error) setError(data.error);
      })
      .catch(() => {
        if (active) setError("Failed to load calendars");
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, [connected]);

  function handleConnect() {
    router.push(`/api/calendar/connect?eventId=${encodeURIComponent(eventId)}`);
  }

  async function handleSelectCalendar(id: string) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/calendar/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId: id }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to save calendar");
      return;
    }
    setCalendarId(id);
    setShowPicker(false);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    const res = await fetch("/api/calendar/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarId: "" }),
    });
    setDisconnecting(false);
    if (!res.ok) {
      setError("Failed to disconnect");
      return;
    }
    setConnected(false);
    setCalendarId(null);
    setCalendars([]);
  }

  if (!connected) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Google Calendar</h3>
        <p className="mb-3 text-xs text-text-tertiary">
          Connect your Google Calendar to sync assigned todos as events.
        </p>
        <Button size="sm" onClick={handleConnect}>
          Connect Google Calendar
        </Button>
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
      </Card>
    );
  }

  const selectedSummary =
    calendars.find((c) => c.id === calendarId)?.summary ??
    (calendarId ? calendarId : null);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Google Calendar</h3>
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
          Connected
        </span>
      </div>

      {showPicker ? (
        <div className="space-y-3">
          {loadingList ? (
            <p className="text-xs text-text-tertiary">Loading calendars…</p>
          ) : (
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">
                Select Calendar
              </label>
              <Select
                value={calendarId ?? ""}
                onChange={(e) => setCalendarId(e.target.value)}
                className="w-full text-xs"
              >
                <option value="">Choose a calendar…</option>
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}
                    {c.primary ? " (primary)" : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">
              Or enter calendar ID manually
            </label>
            <div className="flex gap-2">
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-primary"
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={saving || !manualId.trim()}
                onClick={() => handleSelectCalendar(manualId.trim())}
              >
                Save
              </Button>
            </div>
          </div>

          {calendarId && calendars.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              disabled={saving || !calendarId}
              onClick={() => handleSelectCalendar(calendarId)}
            >
              Save Selection
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary">
            {selectedSummary ? (
              <>
                Syncing to: <span className="text-text-primary">{selectedSummary}</span>
              </>
            ) : (
              <span className="text-text-tertiary">No calendar selected yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowPicker(true)}>
              Change Calendar
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={disconnecting}
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </Card>
  );
}