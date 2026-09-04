"use client";

import { useTransition } from "react";
import { deleteEvent } from "@/lib/actions/events";
import { ConfirmDialog } from "@/components/ui";
import { useState } from "react";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-error px-4 py-2 text-sm text-error hover:bg-error/10"
      >
        Delete Event
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            await deleteEvent(eventId);
          });
        }}
        title="Delete Event"
        message="Deleting an event permanently removes all todos, pages, and data. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </>
  );
}