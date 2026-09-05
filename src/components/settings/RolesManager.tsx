"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import {
  createRole,
  updateRole,
  deleteRole,
  type RoleRow,
} from "@/lib/actions/members";

const PERMISSION_FLAGS = [
  { key: "can_create_todo", label: "Create Todo" },
  { key: "can_delete_todo", label: "Delete Todo" },
  { key: "can_manage_members", label: "Manage Members" },
  { key: "can_edit_pages", label: "Edit Pages" },
  { key: "can_view", label: "View" },
  { key: "can_edit_event", label: "Edit Event" },
  { key: "can_manage_shortcuts", label: "Manage Shortcuts" },
  { key: "can_manage_integrations", label: "Manage Integrations" },
];

export function RolesManager({
  eventId,
  roles: initialRoles = [],
}: {
  eventId: string;
  roles?: RoleRow[];
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles ?? []);
  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const debounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleSave = useCallback(
    (roleId: string, name: string, permissions: Record<string, boolean>) => {
      const existing = debounceRefs.current.get(roleId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        startTransition(async () => {
          const res = await updateRole(roleId, name, permissions);
          if (res.error) setError(res.error);
        });
        debounceRefs.current.delete(roleId);
      }, 500);
      debounceRefs.current.set(roleId, timer);
    },
    [],
  );

  function handleCreate() {
    if (!newRoleName.trim()) return;
    setError(null);
    const name = newRoleName.trim();
    const permissions = Object.fromEntries(
      PERMISSION_FLAGS.map((f) => [f.key, false]),
    );
    startTransition(async () => {
      const res = await createRole(eventId, name, permissions);
      if (res.error) {
        setError(res.error);
        return;
      }
      setNewRoleName("");
      router.refresh();
      setRoles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          name,
          permissions,
        },
      ]);
    });
  }

  function handlePermissionChange(roleId: string, flagKey: string, checked: boolean) {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        const updated = { ...r.permissions, [flagKey]: checked };
        scheduleSave(roleId, r.name, updated);
        return { ...r, permissions: updated };
      }),
    );
  }

  function handleNameChange(roleId: string, name: string) {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r;
        scheduleSave(roleId, name, r.permissions);
        return { ...r, name };
      }),
    );
  }

  function handleDelete(roleId: string) {
    const timer = debounceRefs.current.get(roleId);
    if (timer) {
      clearTimeout(timer);
      debounceRefs.current.delete(roleId);
    }
    startTransition(async () => {
      const res = await deleteRole(roleId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Roles &amp; Permissions</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Role name..."
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            className="w-32 text-xs"
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={pending || !newRoleName.trim()}
            onClick={handleCreate}
            className="whitespace-nowrap"
          >
            + New Role
          </Button>
        </div>
      </div>

      {roles.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          Owner role is created automatically. Add custom roles here.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {sortedRoles.map((role) => (
            <div key={role.id} className="rounded-md border border-border bg-bg-tertiary p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text-primary focus:outline-none"
                  value={role.name}
                  onChange={(e) => handleNameChange(role.id, e.target.value)}
                />
                <button
                  className="text-xs text-text-tertiary hover:text-error"
                  onClick={() => handleDelete(role.id)}
                >
                  Delete
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {PERMISSION_FLAGS.map((flag) => (
                  <label key={flag.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={role.permissions[flag.key] ?? false}
                      onChange={(e) =>
                        handlePermissionChange(role.id, flag.key, e.target.checked)
                      }
                      className="accent-accent"
                    />
                    {flag.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </Card>
  );
}