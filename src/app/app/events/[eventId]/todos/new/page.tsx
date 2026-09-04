import { getMembers } from "@/lib/actions/members";
import { TodoForm } from "@/components/todo/TodoForm";

export default async function NewTodoPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const members = await getMembers(eventId);

  return (
    <div className="p-4">
      <h1 className="mb-6 text-lg font-bold text-text-primary">New Todo</h1>
      <TodoForm eventId={eventId} members={members} />
    </div>
  );
}