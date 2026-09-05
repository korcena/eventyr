import { getEvent, regenerateInviteToken, updateEvent } from "@/lib/actions/events";
import { getRoles, getMembers, updateMemberRole, removeMember } from "@/lib/actions/members";
import { hasPermission } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import { getCalendarTokens } from "@/lib/calendar";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui";
import { RolesManager } from "@/components/settings/RolesManager";
import { MembersList } from "@/components/settings/MembersList";
import { InviteLink } from "@/components/settings/InviteLink";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { DeleteEventButton } from "@/components/settings/DeleteEventButton";

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

  const user = await getCurrentUser();
  const calendarTokens = user
    ? await getCalendarTokens(user.id)
    : { connected: false, calendarId: null };

  return (
    <div className="space-y-3 p-4">
      {canEditEvent && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">General</h3>
          <form
            action={async (formData: FormData) => {
              "use server";
              await updateEvent(eventId, formData);
              revalidatePath(`/app/events/${eventId}/settings`);
            }}
            className="grid grid-cols-2 gap-3"
          >
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

      {canManageMembers && <RolesManager eventId={eventId} roles={roles} />}

      {canManageMembers && (
        <MembersList
          members={members.map((m) => ({
            id: m.id,
            user_id: m.user_id,
            role_id: m.role_id,
            profile: m.profile,
            role: m.role,
          }))}
          roles={roles}
          onRoleChange={async (memberId, roleId) => {
            "use server";
            await updateMemberRole(memberId, roleId);
            revalidatePath(`/app/events/${eventId}/settings`);
          }}
          onRemove={async (memberId) => {
            "use server";
            await removeMember(memberId);
            revalidatePath(`/app/events/${eventId}/settings`);
          }}
        />
      )}

      {canManageMembers && (
        <InviteLink token={event.invite_token} baseUrl={baseUrl} regenerateAction={async () => { "use server"; await regenerateInviteToken(eventId); revalidatePath(`/app/events/${eventId}/settings`); }} />
      )}

      <CalendarSettings
        eventId={eventId}
        connected={calendarTokens.connected}
        calendarId={calendarTokens.calendarId}
      />

      {canEditEvent && (
        <div className="rounded-lg border border-error p-4">
          <h3 className="mb-1 text-sm font-semibold text-error">Danger Zone</h3>
          <p className="mb-3 text-xs text-text-tertiary">
            Deleting an event permanently removes all todos, pages, and data. This cannot be undone.
          </p>
          <DeleteEventButton eventId={event.id} />
        </div>
      )}
    </div>
  );
}