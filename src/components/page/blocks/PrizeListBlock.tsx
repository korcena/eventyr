"use client";

import { useTransition, useState } from "react";
import { updateBlock, type BlockRow } from "@/lib/actions/pages";

interface PrizeItem {
  rank: string;
  prize: string;
  sponsor: string;
}

export function PrizeListBlock({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<PrizeItem[]>((block.content.items as PrizeItem[]) ?? []);

  const save = (newItems: PrizeItem[]) => {
    startTransition(async () => {
      await updateBlock(block.id, { ...block.content, items: newItems });
    });
  };

  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-2 py-1 text-left text-[10px] uppercase text-text-tertiary w-16">Rank</th>
            <th className="px-2 py-1 text-left text-[10px] uppercase text-text-tertiary">Prize</th>
            <th className="px-2 py-1 text-left text-[10px] uppercase text-text-tertiary w-28">Sponsor</th>
            {canEdit && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border">
              <td className="px-2 py-1.5">
                {canEdit ? (
                  <input
                    defaultValue={item.rank}
                    placeholder="1st"
                    onBlur={(e) => {
                      const newItems = [...items];
                      newItems[i] = { ...item, rank: e.target.value };
                      setItems(newItems);
                      save(newItems);
                    }}
                    className="w-full bg-transparent font-semibold text-warning focus:outline-none"
                  />
                ) : (
                  <span className="font-semibold text-warning">{item.rank}</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-text-primary">
                {canEdit ? (
                  <input
                    defaultValue={item.prize}
                    placeholder="Prize description"
                    onBlur={(e) => {
                      const newItems = [...items];
                      newItems[i] = { ...item, prize: e.target.value };
                      setItems(newItems);
                      save(newItems);
                    }}
                    className="w-full bg-transparent focus:outline-none"
                  />
                ) : (
                  item.prize
                )}
              </td>
              <td className="px-2 py-1.5 text-text-secondary">
                {canEdit ? (
                  <input
                    defaultValue={item.sponsor}
                    placeholder="Sponsor"
                    onBlur={(e) => {
                      const newItems = [...items];
                      newItems[i] = { ...item, sponsor: e.target.value };
                      setItems(newItems);
                      save(newItems);
                    }}
                    className="w-full bg-transparent focus:outline-none"
                  />
                ) : (
                  item.sponsor
                )}
              </td>
              {canEdit && (
                <td>
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
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <button
          onClick={() => {
            const newItems = [...items, { rank: "", prize: "", sponsor: "" }];
            setItems(newItems);
          }}
          className="mt-1.5 text-xs text-text-tertiary hover:text-accent"
        >
          + Add prize
        </button>
      )}
    </div>
  );
}