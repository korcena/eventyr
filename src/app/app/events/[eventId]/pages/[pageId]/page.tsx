import { notFound } from "next/navigation";
import { getPage, getBlocks } from "@/lib/actions/pages";
import { hasPermission } from "@/lib/permissions";
import { BlockEditor } from "@/components/page/BlockEditor";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ eventId: string; pageId: string }>;
}) {
  const { eventId, pageId } = await params;
  const page = await getPage(pageId);
  if (!page || page.event_id !== eventId) notFound();

  const blocks = await getBlocks(pageId);
  const canEdit = await hasPermission(eventId, "can_edit_pages");

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text-primary">{page.title}</h1>
        <p className="mt-0.5 text-[11px] text-text-tertiary">
          Last edited {new Date(page.updated_at).toLocaleDateString()}
        </p>
      </div>

      <BlockEditor pageId={pageId} blocks={blocks} canEdit={canEdit} />
    </div>
  );
}