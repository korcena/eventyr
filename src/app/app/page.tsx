import Link from "next/link";
import { Button } from "@/components/ui";
import { getEventsForUser } from "@/lib/actions/events";

export default async function DashboardPage() {
  const events = await getEventsForUser();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Your Events</h1>
        <Link href="/app/events/new">
          <Button size="sm">+ New Event</Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-2 text-sm text-text-secondary">No events yet.</p>
          <p className="mb-4 text-xs text-text-tertiary">
            Create your first event to start planning.
          </p>
          <Link href="/app/events/new">
            <Button size="sm">Create Event</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/app/events/${event.id}`}
              className="rounded-lg border border-border bg-bg-card p-4 transition-colors hover:border-accent"
            >
              <h3 className="mb-1 text-sm font-semibold text-text-primary">{event.name}</h3>
              {event.description && (
                <p className="mb-2 line-clamp-2 text-xs text-text-tertiary">{event.description}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                <span className="rounded-full bg-accent-dim px-2 py-0.5 font-medium text-accent uppercase">
                  {event.type}
                </span>
                {event.start_date && (
                  <span>
                    {new Date(event.start_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}