import { Card } from "@/components/ui";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Todo Stats</p>
          <p className="text-sm text-text-secondary">No todos yet.</p>
        </Card>
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Upcoming Due</p>
          <p className="text-sm text-text-secondary">Nothing due.</p>
        </Card>
        <Card>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">Quick Links</p>
          <p className="text-sm text-text-secondary">No shortcuts yet.</p>
        </Card>
      </div>
    </div>
  );
}