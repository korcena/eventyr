"use client";

import { useActionState } from "react";
import { createTodo, type ActionResult } from "@/lib/actions/todos";
import { Input, Textarea, Select, Button } from "@/components/ui";

interface Member {
  id: string;
  user_id: string;
  profile?: { display_name: string | null } | null;
}

export function TodoForm({
  eventId,
  members,
}: {
  eventId: string;
  members: Member[];
}) {
  const createAction = (_prev: ActionResult, formData: FormData) =>
    createTodo(eventId, formData);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createAction, {
    error: null,
  });

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">Title</label>
        <Input name="title" type="text" placeholder="Set up registration page" required />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-text-secondary">Description</label>
        <Textarea name="description" rows={3} placeholder="Details about this task..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Due Date</label>
          <Input name="due_date" type="datetime-local" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">Assigned To</label>
          <Select name="assigned_to">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.user_id}>
                {m.profile?.display_name ?? "Unknown"}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state.error && <p className="text-sm text-error">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create Todo"}
        </Button>
        <a href={`/app/events/${eventId}/todos`}>
          <Button type="button" variant="ghost">Cancel</Button>
        </a>
      </div>
    </form>
  );
}