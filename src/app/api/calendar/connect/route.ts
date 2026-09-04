import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/calendar";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const eventId = requestUrl.searchParams.get("eventId");
  const state = eventId ? JSON.stringify({ eventId }) : "";
  const authUrl = getAuthUrl(state);
  return NextResponse.redirect(authUrl);
}