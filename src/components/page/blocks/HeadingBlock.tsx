"use client";

import { useTransition } from "react";
import { updateBlock, type BlockRow } from "@/lib/actions/pages";

export function HeadingBlock({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const text = (block.content.text as string) ?? "";
  const level = (block.content.level as number) ?? 2;

  if (!canEdit) {
    if (level === 1) return <h1 className="text-lg font-semibold text-text-primary">{text}</h1>;
    if (level === 3) return <h3 className="text-sm font-semibold text-text-primary">{text}</h3>;
    return <h2 className="text-base font-semibold text-text-primary">{text}</h2>;
  }

  return (
    <input
      defaultValue={text}
      onBlur={(e) => {
        if (e.target.value !== text) {
          startTransition(async () => {
            await updateBlock(block.id, { ...block.content, text: e.target.value });
          });
        }
      }}
      className="w-full bg-transparent text-base font-semibold text-text-primary focus:outline-none"
    />
  );
}