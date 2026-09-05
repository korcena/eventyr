import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.CRON_SECRET;

  if (!expectedKey) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry_run") === "true";

  try {
    const result = await runReminders({ dryRun });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}