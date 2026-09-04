"use client";

import { useTransition, useState } from "react";
import {
  addBlock,
  updateBlock,
  deleteBlock,
  type BlockRow,
} from "@/lib/actions/pages";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { TextBlock } from "./blocks/TextBlock";
import { ListBlock } from "./blocks/ListBlock";
import { TableBlock } from "./blocks/TableBlock";
import { OrganizerListBlock } from "./blocks/OrganizerListBlock";
import { PrizeListBlock } from "./blocks/PrizeListBlock";

const BLOCK_TYPES: { type: BlockRow["type"]; label: string }[] = [
  { type: "heading", label: "Heading" },
  { type: "text", label: "Text" },
  { type: "list", label: "List" },
  { type: "table", label: "Table" },
  { type: "organizer_list", label: "Organizer List" },
  { type: "prize_list", label: "Prize List" },
];

export function BlockEditor({
  pageId,
  blocks,
  canEdit,
}: {
  pageId: string;
  blocks: BlockRow[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="space-y-1.5">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="group flex items-start gap-2 rounded-lg border border-border bg-bg-card px-4 py-3"
        >
          {canEdit && (
            <span className="mt-0.5 cursor-grab text-text-tertiary opacity-0 group-hover:opacity-100">
              ⋮⋮
            </span>
          )}
          <div className="flex-1">
            <p className="mb-1.5 text-[9px] uppercase tracking-wider text-text-tertiary">
              {block.type.replace("_", " ")}
            </p>
            <BlockRenderer block={block} canEdit={canEdit} />
          </div>
          {canEdit && (
            <button
              className="text-text-tertiary opacity-0 hover:text-error group-hover:opacity-100"
              onClick={() =>
                startTransition(async () => {
                  await deleteBlock(block.id);
                })
              }
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <div className="relative pt-2">
          {showAddMenu ? (
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const defaultContent = getDefaultContent(bt.type);
                      await addBlock(pageId, bt.type, defaultContent);
                      setShowAddMenu(false);
                    });
                  }}
                  className="rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary hover:border-accent hover:text-accent"
                >
                  {bt.label}
                </button>
              ))}
              <button
                onClick={() => setShowAddMenu(false)}
                className="rounded-md px-2.5 py-1 text-xs text-text-tertiary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddMenu(true)}
              className="rounded-md border border-border border-dashed px-3 py-1.5 text-xs text-text-tertiary hover:border-accent hover:text-accent"
            >
              + Add Block
            </button>
          )}
        </div>
      )}

      {blocks.length === 0 && !canEdit && (
        <p className="py-8 text-center text-sm text-text-tertiary">This page has no content yet.</p>
      )}
    </div>
  );
}

function getDefaultContent(type: BlockRow["type"]): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "New Heading", level: 2 };
    case "text":
      return { text: "" };
    case "list":
      return { items: [] };
    case "table":
      return { headers: [], rows: [] };
    case "organizer_list":
      return { items: [{ name: "", role: "", contact: "" }] };
    case "prize_list":
      return { items: [{ rank: "", prize: "", sponsor: "" }] };
    default:
      return {};
  }
}

function BlockRenderer({ block, canEdit }: { block: BlockRow; canEdit: boolean }) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock block={block} canEdit={canEdit} />;
    case "text":
      return <TextBlock block={block} canEdit={canEdit} />;
    case "list":
      return <ListBlock block={block} canEdit={canEdit} />;
    case "table":
      return <TableBlock block={block} canEdit={canEdit} />;
    case "organizer_list":
      return <OrganizerListBlock block={block} canEdit={canEdit} />;
    case "prize_list":
      return <PrizeListBlock block={block} canEdit={canEdit} />;
    default:
      return <p className="text-xs text-text-tertiary">Unknown block type</p>;
  }
}