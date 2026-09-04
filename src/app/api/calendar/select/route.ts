import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectCalendar } from "@/lib/calendar";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { calendarId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const calendarId = body.calendarId;
  if (!calendarId || typeof calendarId !== "string") {
    return NextResponse.json({ error: "calendarId is required" }, { status: 400 });
  }

  try {
    await selectCalendar(user.id, calendarId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to select calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}