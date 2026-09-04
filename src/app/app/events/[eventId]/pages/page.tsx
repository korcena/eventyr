import { getPages, getBlocks, type PageRow, type BlockRow } from "@/lib/actions/pages";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui";
import { PageTree } from "@/components/page/PageTree";
import { PageSearch } from "@/components/page/PageSearch";
import Link from "next/link";

export default async function PagesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const pages = await getPages(eventId);
  const canEdit = await hasPermission(eventId, "can_edit_pages");

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-56 border-r border-border p-3">
        {canEdit && (
          <form
            action={async (formData: FormData) => {
              "use server";
              const { createPage } = await import("@/lib/actions/pages");
              await createPage(eventId, formData.get("title") as string);
            }}
            className="mb-3"
          >
            <div className="flex gap-1.5">
              <input
                name="title"
                placeholder="New page title..."
                className="flex-1 rounded-md border border-border bg-bg-tertiary px-2.5 py-1 text-xs text-text-primary placeholder:text-text-tertiary"
                required
              />
              <Button type="submit" size="sm" variant="ghost">+</Button>
            </div>
          </form>
        )}

        <PageSearch eventId={eventId} />

        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-text-tertiary">Pages</p>
          <PageTree pages={pages} eventId={eventId} />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-text-tertiary">Select a page to view or edit</p>
      </div>
    </div>
  );
}