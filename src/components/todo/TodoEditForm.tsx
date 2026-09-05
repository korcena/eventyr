"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateTodo, type ActionResult } from "@/lib/actions/todos";
import { Input, Textarea, Button } from "@/components/ui";

interface Member {
  id: string;
  user_id: string;
  profile?: { display_name: string | null } | null;
}

interface Assignee {
  user_id: string;
  profile: { display_name: string | null } | null;
}

export function TodoEditForm({
  todoId,
  eventId,
  title,
  description,
  dueDate,
  assignees,
  members,
}: {
  todoId: string;
  eventId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignees: Assignee[];
  members: Member[];
}) {
  const router = useRouter();
  const submitted = useRef(false);
  const assigneeIds = new Set(assignees.map((a) => a.user_id));

  const editAction = (_prev: ActionResult, formData: FormData) => {
    submitted.current = true;
    return updateTodo(todoId, formData);
  };
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(editAction, {
    error: null,
  });

  useEffect(() => {
    if (submitted.current && state.error === null && !pending) {
      router.push(`/app/events/${eventId}/todos`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.error, pending]);

  const dueDateValue = dueDate
    ? new Date(dueDate).toISOString().slice(0, 16)
    : "";

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Title</label>
        <Input name="title" type="text" defaultValue={title} required className="text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Description</label>
        <Textarea name="description" rows={2} defaultValue={description ?? ""} className="text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Due Date</label>
          <Input name="due_date" type="datetime-local" defaultValue={dueDateValue} className="text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-text-tertiary">Assignees</label>
          <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-bg-tertiary p-2 space-y-1">
            {members.length === 0 && (
              <span className="text-xs text-text-tertiary">No members</span>
            )}
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  name="assignee_ids"
                  value={m.user_id}
                  defaultChecked={assigneeIds.has(m.user_id)}
                  className="accent-accent"
                />
                {m.profile?.display_name ?? "Unknown"}
              </label>
            ))}
          </div>
        </div>
      </div>

      {state.error && <p className="text-xs text-error">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}