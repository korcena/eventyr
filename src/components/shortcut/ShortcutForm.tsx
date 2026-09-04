"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createShortcut, type ActionResult } from "@/lib/actions/shortcuts";
import { Input, Button, Dialog } from "@/components/ui";

export function ShortcutForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);

  const createAction = (_prev: ActionResult, formData: FormData) =>
    createShortcut(eventId, formData);
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createAction, {
    error: null,
  });

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add Shortcut
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add Shortcut">
        <form
          action={formAction}
          className="space-y-4"
          onSubmit={() => setOpen(false)}
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">Label</label>
            <Input name="label" type="text" placeholder="Registration page" required />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">URL</label>
            <Input name="url" type="url" placeholder="https://example.com" required />
          </div>

          {state.error && <p className="text-sm text-error">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Adding..." : "Add Shortcut"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}