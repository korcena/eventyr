import { joinEventByToken } from "@/lib/actions/members";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await joinEventByToken(token);

  if (result.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-bold text-text-primary">Unable to Join</h1>
          <p className="mb-4 text-sm text-text-tertiary">{result.error}</p>
          <a href="/app">
            <Button variant="ghost" size="sm">Go to Dashboard</Button>
          </a>
        </div>
      </div>
    );
  }

  redirect("/app");
}