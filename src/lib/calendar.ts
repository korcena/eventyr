import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, decrypt } from "@/lib/crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendars.readonly",
];

export const CALENDAR_SCOPES = SCOPES;

function getOAuthClient(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirect = redirectUri ?? process.env.GOOGLE_REDIRECT_URI!;
  return new google.auth.OAuth2(clientId, clientSecret, redirect);
}

export function getAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string, redirectUri?: string) {
  const client = getOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
  calendarId: string | null;
}

async function loadTokens(userId: string): Promise<StoredTokens | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at, calendar_id")
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  return {
    accessToken: decrypt(data.access_token),
    refreshToken: decrypt(data.refresh_token),
    expiresAt: data.expires_at,
    calendarId: data.calendar_id,
  };
}

async function storeTokens(
  userId: string,
  tokens: {
    access_token: string | null;
    refresh_token: string | null;
    expiry_date: number | null;
  },
  calendarId?: string | null,
) {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing access or refresh token");
  }
  const admin = createAdminClient();
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : null;
  const payload: Record<string, unknown> = {
    user_id: userId,
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  };
  if (calendarId !== undefined) payload.calendar_id = calendarId;

  const { error } = await admin
    .from("google_calendar_tokens")
    .upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

export async function refreshTokenIfNeeded(userId: string): Promise<string> {
  const stored = await loadTokens(userId);
  if (!stored) throw new Error("User has not connected Google Calendar");

  const needsRefresh =
    !stored.expiresAt || new Date(stored.expiresAt).getTime() - 60_000 <= Date.now();

  if (!needsRefresh) return stored.accessToken;

  const client = getOAuthClient();
  client.setCredentials({
    refresh_token: stored.refreshToken,
  });
  const { credentials } = await client.refreshAccessToken();
  await storeTokens(userId, {
    access_token: credentials.access_token ?? null,
    refresh_token: credentials.refresh_token ?? stored.refreshToken,
    expiry_date: credentials.expiry_date ?? null,
  });
  return credentials.access_token!;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  primary: boolean;
}

export async function getCalendarList(userId: string): Promise<CalendarListItem[]> {
  const accessToken = await refreshTokenIfNeeded(userId);
  const stored = await loadTokens(userId);
  if (!stored) throw new Error("User has not connected Google Calendar");

  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: "v3", auth: client });
  const { data } = await calendar.calendarList.list();
  const items = data.items ?? [];
  return items.map((item) => ({
    id: item.id ?? "",
    summary: item.summary ?? "",
    primary: Boolean(item.primary),
  }));
}

interface TodoForSync {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
}

async function getTodoForSync(todoId: string): Promise<TodoForSync | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("todos")
    .select("id, title, description, due_date")
    .eq("id", todoId)
    .single();
  return (data as TodoForSync | null) ?? null;
}

export async function syncTodoToCalendar(
  todoId: string,
  userId: string,
): Promise<{ googleEventId: string } | null> {
  const stored = await loadTokens(userId);
  if (!stored || !stored.calendarId) {
    return null;
  }

  const todo = await getTodoForSync(todoId);
  if (!todo) return null;

  const accessToken = await refreshTokenIfNeeded(userId);
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("calendar_sync_state")
    .select("id, google_event_id")
    .eq("todo_id", todoId)
    .eq("user_id", userId)
    .single();

  const start = todo.due_date
    ? { dateTime: new Date(todo.due_date).toISOString() }
    : { date: new Date().toISOString().slice(0, 10) };
  const end = todo.due_date
    ? {
        dateTime: new Date(
          new Date(todo.due_date).getTime() + 30 * 60 * 1000,
        ).toISOString(),
      }
    : { date: new Date().toISOString().slice(0, 10) };

  const eventData = {
    summary: todo.title,
    description: todo.description ?? undefined,
    start,
    end,
  };

  let googleEventId: string;

  if (existing?.google_event_id) {
    const { data: updated } = await calendar.events.update({
      calendarId: stored.calendarId,
      eventId: existing.google_event_id,
      requestBody: eventData,
    });
    googleEventId = updated?.id ?? existing.google_event_id;
  } else {
    const { data: created } = await calendar.events.insert({
      calendarId: stored.calendarId,
      requestBody: eventData,
    });
    googleEventId = created?.id ?? "";
  }

  await admin.from("calendar_sync_state").upsert(
    {
      todo_id: todoId,
      user_id: userId,
      google_event_id: googleEventId,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "todo_id, user_id" },
  );

  return { googleEventId };
}

export async function deleteCalendarEvent(
  todoId: string,
  userId: string,
): Promise<void> {
  const stored = await loadTokens(userId);
  if (!stored || !stored.calendarId) {
    return;
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("calendar_sync_state")
    .select("id, google_event_id")
    .eq("todo_id", todoId)
    .eq("user_id", userId)
    .single();
  if (!existing?.google_event_id) return;

  const accessToken = await refreshTokenIfNeeded(userId);
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  try {
    await calendar.events.delete({
      calendarId: stored.calendarId,
      eventId: existing.google_event_id,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      // Event already gone; ignore.
    } else {
      throw err;
    }
  }

  await admin
    .from("calendar_sync_state")
    .delete()
    .eq("todo_id", todoId)
    .eq("user_id", userId);
}

export async function disconnectCalendar(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("calendar_sync_state").delete().eq("user_id", userId);
  await admin.from("google_calendar_tokens").delete().eq("user_id", userId);
}

export async function selectCalendar(
  userId: string,
  calendarId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("google_calendar_tokens")
    .update({ calendar_id: calendarId, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getCalendarTokens(userId: string): Promise<{
  connected: boolean;
  calendarId: string | null;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("google_calendar_tokens")
    .select("calendar_id")
    .eq("user_id", userId)
    .single();
  if (!data) return { connected: false, calendarId: null };
  return { connected: true, calendarId: data.calendar_id };
}