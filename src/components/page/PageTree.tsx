import Link from "next/link";
import type { PageRow } from "@/lib/actions/pages";

export function PageTree({
  pages,
  eventId,
  parentId = null,
  depth = 0,
}: {
  pages: PageRow[];
  eventId: string;
  parentId?: string | null;
  depth?: number;
}) {
  const children = pages.filter((p) => p.parent_id === parentId);

  if (children.length === 0 && depth === 0) {
    return <p className="text-xs text-text-tertiary">No pages yet.</p>;
  }

  return (
    <div className="space-y-0.5">
      {children.map((page) => {
        const hasChildren = pages.some((p) => p.parent_id === page.id);
        return (
          <div key={page.id}>
            <Link
              href={`/app/events/${eventId}/pages/${page.id}`}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <span>{hasChildren ? "▸" : "📄"}</span>
              <span className="truncate">{page.title}</span>
            </Link>
            {hasChildren && (
              <PageTree pages={pages} eventId={eventId} parentId={page.id} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}