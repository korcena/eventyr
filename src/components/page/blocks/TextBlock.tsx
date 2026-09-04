"use client";

import { useTransition } from "react";
import { updateBlock, type BlockRow } from "@/lib/actions/pages";

export function TextBlock({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const text = (block.content.text as string) ?? "";

  if (!canEdit) {
    return <p className="text-sm leading-relaxed text-text-secondary">{text}</p>;
  }

  return (
    <textarea
      defaultValue={text}
      rows={2}
      onBlur={(e) => {
        if (e.target.value !== text) {
          startTransition(async () => {
            await updateBlock(block.id, { ...block.content, text: e.target.value });
          });
        }
      }}
      className="w-full resize-y bg-transparent text-sm leading-relaxed text-text-secondary focus:outline-none"
    />
  );
}