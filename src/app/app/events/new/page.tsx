"use client";

import { useActionState } from "react";
import { createEvent, type ActionResult } from "@/lib/actions/events";
import { Input, Textarea, Select, Button } from "@/components/ui";

export default function NewEventPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createEvent, {
    error: null,
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <h1 className="mb-6 text-xl font-bold text-text-primary">Create New Event</h1>

      <form action={formAction} className="max-w-lg space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Event Name
          </label>
          <Input name="name" type="text" placeholder="Hackathon 2026" required />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Type
          </label>
          <Select name="type" defaultValue="hackathon">
            <option value="hackathon">Hackathon</option>
            <option value="workshop">Workshop</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Start Date
            </label>
            <Input name="start_date" type="datetime-local" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              End Date
            </label>
            <Input name="end_date" type="datetime-local" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Description
          </label>
          <Textarea name="description" rows={3} placeholder="A 48-hour hackathon for builders..." />
        </div>

        {state.error && <p className="text-sm text-error">{state.error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create Event"}
          </Button>
          <a href="/app">
            <Button type="button" variant="ghost">Cancel</Button>
          </a>
        </div>
      </form>
    </div>
  );
}