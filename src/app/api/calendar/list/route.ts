import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarList } from "@/lib/calendar";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const calendars = await getCalendarList(user.id);
    return NextResponse.json({ calendars });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list calendars";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}