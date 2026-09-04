"use client";

import { useState } from "react";
import { Card, Button } from "@/components/ui";

export function InviteLink({
  token,
  baseUrl,
  onRegenerate,
}: {
  token: string;
  baseUrl: string;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
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
        <Button size="sm" variant="ghost" onClick={onRegenerate}>
          Regenerate
        </Button>
      </div>
    </Card>
  );
}