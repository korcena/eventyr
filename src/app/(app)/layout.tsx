import { getCurrentUser } from "@/lib/auth";
import { getEventsForUser } from "@/lib/actions/events";
import { logout } from "@/app/(auth)/actions";
import { EventsSidebar } from "@/components/sidebar/EventsSidebar";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const events = await getEventsForUser();

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <EventsSidebar events={events} user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}

// Re-export logout for use in components
export { logout };