"use client";

import { useState } from "react";
import { Card, Button, Input } from "@/components/ui";

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

export function RolesManager({ eventId }: { eventId: string }) {
  const [roles, setRoles] = useState<Array<{
    id: string;
    name: string;
    permissions: Record<string, boolean>;
  }>>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // This is a placeholder - in production, roles would be loaded via server
  // and mutations would call server actions

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Roles & Permissions</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Role name..."
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className="w-32 text-xs"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!newRoleName.trim()) return;
              setRoles([...roles, {
                id: crypto.randomUUID(),
                name: newRoleName.trim(),
                permissions: Object.fromEntries(PERMISSION_FLAGS.map((f) => [f.key, false])),
              }]);
              setNewRoleName("");
            }}
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
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role.id} className="rounded-md border border-border bg-bg-tertiary p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  className="bg-transparent text-sm font-medium text-text-primary focus:outline-none"
                  value={role.name}
                  onChange={(e) =>
                    setRoles(roles.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)))
                  }
                />
                <button
                  className="text-xs text-text-tertiary hover:text-error"
                  onClick={() => setRoles(roles.filter((r) => r.id !== role.id))}
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
                        setRoles(roles.map((r) =>
                          r.id === role.id
                            ? { ...r, permissions: { ...r.permissions, [flag.key]: e.target.checked } }
                            : r,
                        ))
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