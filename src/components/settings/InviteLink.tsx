"use client";

import { useTransition, useState } from "react";
import { Card, Button } from "@/components/ui";

export function InviteLink({
  token,
  baseUrl,
  regenerateAction,
}: {
  token: string;
  baseUrl: string;
  regenerateAction: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const url = `${baseUrl}/invite/${token}`;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Invite Link</h3>
      <div className="mb-2 break-all rounded-md border border-border bg-bg-tertiary px-2.5 py-2 text-[11px] text-text-secondary">
        {url}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </Button>
        <form action={() => startTransition(regenerateAction)}>
          <Button type="submit" size="sm" variant="ghost" disabled={pending}>
            {pending ? "Regenerating..." : "Regenerate"}
          </Button>
        </form>
      </div>
    </Card>
  );
}