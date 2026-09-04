import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/calendar";
import { encrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const stateParam = requestUrl.searchParams.get("state") ?? "";
  const errorParam = requestUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/app?calendar_error=${encodeURIComponent(errorParam)}`, requestUrl.origin),
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/app", requestUrl.origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  let eventId: string | null = null;
  try {
    if (stateParam) {
      const parsed = JSON.parse(stateParam) as { eventId?: string };
      eventId = parsed.eventId ?? null;
    }
  } catch {
    eventId = null;
  }

  try {
    const tokens = await exchangeCodeForTokens(code, requestUrl.origin + "/api/calendar/callback");
    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/app?calendar_error=missing_tokens", requestUrl.origin),
      );
    }

    const admin = createAdminClient();
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null;
    const { error } = await admin.from("google_calendar_tokens").upsert(
      {
        user_id: user.id,
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;

    const redirectPath = eventId
      ? `/app/events/${eventId}/settings`
      : "/app";
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/app?calendar_error=${encodeURIComponent(message)}`, requestUrl.origin),
    );
  }
}