import { getShortcuts, type ShortcutRow } from "@/lib/actions/shortcuts";
import { hasPermission } from "@/lib/permissions";
import { Card, Button } from "@/components/ui";
import { ShortcutForm } from "@/components/shortcut/ShortcutForm";

export default async function ShortcutsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const shortcuts = await getShortcuts(eventId);
  const canManage = await hasPermission(eventId, "can_manage_shortcuts");

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h1 className="text-sm font-semibold text-text-primary">Shortcuts</h1>
        {canManage && <ShortcutForm eventId={eventId} />}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {shortcuts.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-tertiary">No shortcuts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shortcuts.map((shortcut) => (
              <ShortcutCard key={shortcut.id} shortcut={shortcut} canManage={canManage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShortcutCard({
  shortcut,
  canManage,
}: {
  shortcut: ShortcutRow;
  canManage: boolean;
}) {
  let faviconUrl: string | null = null;
  try {
    const domain = new URL(shortcut.url).hostname;
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    faviconUrl = null;
  }

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        {faviconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faviconUrl}
            alt=""
            width={24}
            height={24}
            className="mt-0.5 h-6 w-6 shrink-0 rounded-sm"
          />
        ) : (
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-bg-tertiary text-xs text-text-tertiary">
            {shortcut.icon ?? "🔗"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <a
            href={shortcut.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm font-medium text-text-primary hover:text-accent"
          >
            {shortcut.label}
          </a>
          <p className="truncate text-xs text-text-tertiary">{shortcut.url}</p>
        </div>
      </div>
      {canManage && (
        <div className="flex justify-end gap-2 border-t border-border pt-2">
          <form
            action={async () => {
              "use server";
              const { deleteShortcut } = await import("@/lib/actions/shortcuts");
              await deleteShortcut(shortcut.id);
            }}
          >
            <Button type="submit" size="sm" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

export type { ShortcutRow };