import { notFound } from "next/navigation";
import { getEvent } from "@/lib/actions/events";
import { isEventMember } from "@/lib/permissions";
import { EventTabs } from "@/components/event/EventTabs";
import { EventHeader } from "@/components/event/EventHeader";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);

  if (!event) notFound();

  const isMember = await isEventMember(eventId);
  if (!isMember) notFound();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EventHeader event={event} />
      <EventTabs eventId={eventId} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}