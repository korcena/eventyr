import { getEvent } from "@/lib/actions/events";
import { getRoles, getMembers } from "@/lib/actions/members";
import { hasPermission } from "@/lib/permissions";
import { Card } from "@/components/ui";
import { RolesManager } from "@/components/settings/RolesManager";
import { InviteLink } from "@/components/settings/InviteLink";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return null;

  const canEditEvent = await hasPermission(eventId, "can_edit_event");
  const canManageMembers = await hasPermission(eventId, "can_manage_members");

  const roles = await getRoles(eventId);
  const members = await getMembers(eventId);
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  return (
    <div className="space-y-3 p-4">
      {canEditEvent && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">General</h3>
          <form className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Name</label>
              <input
                name="name"
                defaultValue={event.name}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Type</label>
              <select
                name="type"
                defaultValue={event.type}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
              >
                <option value="hackathon">Hackathon</option>
                <option value="workshop">Workshop</option>
                <option value="social">Social</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Start Date</label>
              <input
                name="start_date"
                type="datetime-local"
                defaultValue={event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : ""}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">End Date</label>
              <input
                name="end_date"
                type="datetime-local"
                defaultValue={event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : ""}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Description</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={event.description ?? ""}
                className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm text-white">
                Save Changes
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text-primary">Telegram Reminders</h3>
        <p className="mb-3 text-xs text-text-tertiary">
          Configure bot to send reminders 3 and 1 day before due dates.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Bot Token</label>
            <input
              type="password"
              placeholder="••••••••••••"
              className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Chat ID</label>
            <input
              placeholder="-1001234567890"
              className="w-full rounded-md border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
            />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button className="rounded-md bg-accent px-3 py-1.5 text-xs text-white">Save</button>
          <button className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary">
            Send Test Message
          </button>
        </div>
      </Card>

      {canManageMembers && <RolesManager eventId={eventId} />}

      {canManageMembers && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Members ({members.length})</h3>
          <div className="space-y-2">
            {members.map((member) => {
              const initials = member.profile?.display_name
                ? member.profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
                : "??";
              return (
                <div key={member.id} className="flex items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#333] text-[9px] text-text-secondary">
                    {initials}
                  </div>
                  <span className="flex-1 text-xs text-text-primary">
                    {member.profile?.display_name ?? "Unknown"}
                  </span>
                  <select
                    defaultValue={member.role_id}
                    className="w-28 rounded-md border border-border bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {canManageMembers && (
        <InviteLink token={event.invite_token} baseUrl={baseUrl} onRegenerate={() => {}} />
      )}

      {canEditEvent && (
        <div className="rounded-lg border border-error p-4">
          <h3 className="mb-1 text-sm font-semibold text-error">Danger Zone</h3>
          <p className="mb-3 text-xs text-text-tertiary">
            Deleting an event permanently removes all todos, pages, and data. This cannot be undone.
          </p>
          <button className="rounded-md border border-error px-4 py-2 text-sm text-error hover:bg-error/10">
            Delete Event
          </button>
        </div>
      )}
    </div>
  );
}