import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";

export default async function AppPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">
          Welcome, {user?.displayName || "User"}
        </h1>
        <p className="mb-6 text-sm text-text-tertiary">
          Your events will appear here
        </p>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      </div>
    </div>
  );
}