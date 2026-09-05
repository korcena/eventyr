"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTodo, type ActionResult } from "@/lib/actions/todos";
import { Input, Textarea, Button } from "@/components/ui";

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
  const router = useRouter();
  const submitted = useRef(false);
  const createAction = (_prev: ActionResult, formData: FormData) => {
    submitted.current = true;
    return createTodo(eventId, formData);
  };
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createAction, {
    error: null,
  });

  useEffect(() => {
    if (submitted.current && state.error === null && !pending) {
      router.push(`/app/events/${eventId}/todos`);
    }
  }, [state.error, pending, router, eventId]);

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
          <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-bg-tertiary p-2 space-y-1">
            {members.length === 0 && (
              <span className="text-xs text-text-tertiary">No members</span>
            )}
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  name="assignee_ids"
                  value={m.user_id}
                  className="accent-accent"
                />
                {m.profile?.display_name ?? "Unknown"}
              </label>
            ))}
          </div>
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