import { getCurrentUser } from "@/lib/auth";
import { getEventsForUser } from "@/lib/actions/events";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getCurrentUser();
  const events = user ? await getEventsForUser() : [];

  return <ChatPanel user={user!} events={events} />;
}