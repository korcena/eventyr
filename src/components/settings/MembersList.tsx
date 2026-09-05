"use client";

import { useState, useMemo } from "react";
import { Card, Select } from "@/components/ui";

interface Member {
  id: string;
  user_id: string;
  role_id: string;
  profile?: { display_name: string | null } | null;
  role?: { id: string; name: string } | null;
}

interface Role {
  id: string;
  name: string;
}

export function MembersList({
  members,
  roles,
  onRoleChange,
  onRemove,
}: {
  members: Member[];
  roles: Role[];
  onRoleChange: (memberId: string, roleId: string) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}) {
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({});
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );

  const changedMembers = Object.keys(roleChanges);

  const handleRoleChange = (memberId: string, roleId: string) => {
    setRoleChanges((prev) => ({ ...prev, [memberId]: roleId }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(roleChanges).map(([memberId, roleId]) =>
          onRoleChange(memberId, roleId)
        )
      );
      setRoleChanges({});
      setShowSaveModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemove) return;
    await onRemove(pendingRemove);
    setPendingRemove(null);
  };

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Members ({members.length})
      </h3>
      <div className="space-y-2">
        {members.map((member) => {
          const initials = member.profile?.display_name
            ? member.profile.display_name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "??";
          const changedRole = roleChanges[member.id];
          const hasChange = changedRole !== undefined;
          return (
            <div
              key={member.id}
              className="flex items-center gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#333] text-[9px] text-text-secondary">
                {initials}
              </div>
              <span className="flex-1 text-xs text-text-primary">
                {member.profile?.display_name ?? "Unknown"}
              </span>
              <Select
                value={changedRole ?? member.role_id}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                className={`w-28 text-xs ${hasChange ? "border-accent" : ""}`}
              >
                {sortedRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
              <button
                className="text-xs text-text-tertiary hover:text-error"
                onClick={() => setPendingRemove(member.id)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {changedMembers.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            {changedMembers.length} role change{changedMembers.length > 1 ? "s" : ""} pending
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
              onClick={() => setRoleChanges({})}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-accent px-3 py-1 text-xs text-white"
              onClick={() => setShowSaveModal(true)}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-80 rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">
              Confirm Role Changes
            </h3>
            <p className="mb-3 text-xs text-text-tertiary">
              You are about to update {changedMembers.length} member role{changedMembers.length > 1 ? "s" : ""}. This will affect their permissions.
            </p>
            <div className="mb-4 space-y-1">
              {changedMembers.map((memberId) => {
                const member = members.find((m) => m.id === memberId);
                const oldRole = roles.find((r) => r.id === member?.role_id);
                const newRole = roles.find((r) => r.id === roleChanges[memberId]);
                return (
                  <div key={memberId} className="text-xs text-text-secondary">
                    {member?.profile?.display_name ?? "Unknown"}:{" "}
                    <span className="text-text-tertiary">{oldRole?.name}</span>
                    {" → "}
                    <span className="text-accent">{newRole?.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-accent px-3 py-1 text-xs text-white disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-72 rounded-lg border border-border bg-bg-secondary p-4">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">
              Remove Member
            </h3>
            <p className="mb-4 text-xs text-text-tertiary">
              Are you sure? This will remove{" "}
              {members.find((m) => m.id === pendingRemove)?.profile?.display_name ?? "this member"} from the event.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
                onClick={() => setPendingRemove(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-error px-3 py-1 text-xs text-white"
                onClick={handleConfirmRemove}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}