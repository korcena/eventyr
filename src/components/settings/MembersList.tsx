"use client";

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
  onRoleChange: (memberId: string, roleId: string) => void;
  onRemove: (memberId: string) => void;
}) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Members ({members.length})
      </h3>
      <div className="space-y-2">
        {members.map((member) => {
          const initials = member.profile?.display_name
            ? member.profile.display_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
            : "??";
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
                value={member.role_id}
                onChange={(e) => onRoleChange(member.id, e.target.value)}
                className="w-28 text-xs"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
              <button
                className="text-xs text-text-tertiary hover:text-error"
                onClick={() => onRemove(member.id)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}