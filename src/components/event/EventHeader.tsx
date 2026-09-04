interface EventHeaderProps {
  event: {
    id: string;
    name: string;
    type: string;
    start_date: string | null;
    end_date: string | null;
  };
}

export function EventHeader({ event }: EventHeaderProps) {
  const dateRange =
    event.start_date && event.end_date
      ? `${new Date(event.start_date).toLocaleDateString()} – ${new Date(event.end_date).toLocaleDateString()}`
      : event.start_date
        ? new Date(event.start_date).toLocaleDateString()
        : null;

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold text-text-primary">{event.name}</span>
        <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
          {event.type}
        </span>
        {dateRange && <span className="text-[11px] text-text-tertiary">{dateRange}</span>}
      </div>
    </div>
  );
}