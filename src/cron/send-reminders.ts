#!/usr/bin/env tsx
import { runReminders } from "@/lib/reminders";

const DRY_RUN = process.env.DRY_RUN === "true";

runReminders({ dryRun: DRY_RUN })
  .then((result) => {
    console.log("[cron] result:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[cron] fatal:", err);
    process.exit(1);
  });