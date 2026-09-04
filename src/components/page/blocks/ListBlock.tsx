"use client";

import { useTransition, useState } from "react";
import { updateBlock, type BlockRow } from "@/lib/actions/pages";

export function ListBlock({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<string[]>((block.content.items as string[]) ?? []);

  const save = (newItems: string[]) => {
    startTransition(async () => {
      await updateBlock(block.id, { ...block.content, items: newItems });
    });
  };

  return (
    <div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
            <span>•</span>
            {canEdit ? (
              <input
                defaultValue={item}
                onBlur={(e) => {
                  const newItems = [...items];
                  newItems[i] = e.target.value;
                  setItems(newItems);
                  save(newItems);
                }}
                className="flex-1 bg-transparent focus:outline-none"
              />
            ) : (
              <span>{item}</span>
            )}
            {canEdit && (
              <button
                onClick={() => {
                  const newItems = items.filter((_, idx) => idx !== i);
                  setItems(newItems);
                  save(newItems);
                }}
                className="text-text-tertiary hover:text-error"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <button
          onClick={() => {
            const newItems = [...items, ""];
            setItems(newItems);
          }}
          className="mt-1 text-xs text-text-tertiary hover:text-accent"
        >
          + Add item
        </button>
      )}
    </div>
  );
}