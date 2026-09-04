"use client";

import { useTransition, useState } from "react";
import { updateBlock, type BlockRow } from "@/lib/actions/pages";

interface OrganizerItem {
  name: string;
  role: string;
  contact: string;
}

export function OrganizerListBlock({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<OrganizerItem[]>(
    (block.content.items as OrganizerItem[]) ?? [],
  );

  const save = (newItems: OrganizerItem[]) => {
    startTransition(async () => {
      await updateBlock(block.id, { ...block.content, items: newItems });
    });
  };

  return (
    <div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-border pb-1.5 last:border-0">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#333] text-[9px] text-text-secondary">
              {item.name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
            </div>
            {canEdit ? (
              <>
                <input
                  defaultValue={item.name}
                  placeholder="Name"
                  onBlur={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, name: e.target.value };
                    setItems(newItems);
                    save(newItems);
                  }}
                  className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none"
                />
                <input
                  defaultValue={item.role}
                  placeholder="Role"
                  onBlur={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, role: e.target.value };
                    setItems(newItems);
                    save(newItems);
                  }}
                  className="w-24 bg-transparent text-xs text-text-secondary focus:outline-none"
                />
                <input
                  defaultValue={item.contact}
                  placeholder="Contact"
                  onBlur={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, contact: e.target.value };
                    setItems(newItems);
                    save(newItems);
                  }}
                  className="w-36 bg-transparent text-xs text-accent focus:outline-none"
                />
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
              </>
            ) : (
              <>
                <span className="flex-1 text-xs text-text-primary">{item.name}</span>
                <span className="text-xs text-text-secondary">{item.role}</span>
                <span className="text-xs text-accent">{item.contact}</span>
              </>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <button
          onClick={() => {
            const newItems = [...items, { name: "", role: "", contact: "" }];
            setItems(newItems);
          }}
          className="mt-1.5 text-xs text-text-tertiary hover:text-accent"
        >
          + Add organizer
        </button>
      )}
    </div>
  );
}