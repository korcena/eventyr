import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTodoToCalendar } from "@/lib/calendar";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { todoId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const todoId = body.todoId;
  if (!todoId || typeof todoId !== "string") {
    return NextResponse.json({ error: "todoId is required" }, { status: 400 });
  }

  try {
    const result = await syncTodoToCalendar(todoId, user.id);
    if (!result) {
      return NextResponse.json(
        { error: "Calendar not connected or no calendar selected" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, googleEventId: result.googleEventId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync todo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}