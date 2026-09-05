import { notFound, redirect } from "next/navigation";
import { getPage, deletePage } from "@/lib/actions/pages";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { PageEditorBody } from "@/components/page/PageEditorBody";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import "react-quill-new/dist/quill.snow.css";

export default async function PageEditorPage({
  params,
}: {
  params: Promise<{ eventId: string; pageId: string }>;
}) {
  const { eventId, pageId } = await params;
  const page = await getPage(pageId);
  if (!page || page.event_id !== eventId) notFound();

  const canEdit = await hasPermission(eventId, "can_edit_pages");

  async function handleDelete() {
    "use server";
    await deletePage(pageId);
    revalidatePath(`/app/events/${eventId}/pages`);
    redirect(`/app/events/${eventId}/pages`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-4">
      <Link
        href={`/app/events/${eventId}/pages`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Back to pages
      </Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{page.title}</h1>
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            Last edited {new Date(page.updated_at).toLocaleDateString()}
          </p>
        </div>
        {canEdit && (
          <form action={handleDelete}>
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1 text-xs text-text-tertiary hover:border-error hover:text-error"
            >
              Delete
            </button>
          </form>
        )}
      </div>

      <PageEditorBody
        pageId={pageId}
        content={page.content ?? ""}
        canEdit={canEdit}
      />
    </div>
  );
}