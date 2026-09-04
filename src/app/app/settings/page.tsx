import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPendingTelegram } from "@/lib/actions/telegram-user";
import { TelegramConnect } from "@/components/settings/TelegramConnect";
import { logout } from "@/app/(auth)/actions";
import { Card } from "@/components/ui";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: telegramData } = await supabase
    .from("telegram_users")
    .select("chat_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const pendingRequests = await getPendingTelegram();
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <h1 className="mb-6 text-xl font-bold text-text-primary">Profile Settings</h1>

      <div className="max-w-lg space-y-4">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Account</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-text-tertiary">Name: </span>
              <span className="text-text-primary">{user.displayName}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Email: </span>
              <span className="text-text-primary">{user.email}</span>
            </div>
          </div>
          <div className="mt-4">
            <form action={logout}>
              <button className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary">
                Log out
              </button>
            </form>
          </div>
        </Card>

        <TelegramConnect
          chatId={telegramData?.chat_id ?? null}
          botUsername={botUsername}
          pendingRequests={pendingRequests as { id: string; chat_id: string; email: string; telegram_username: string | null; created_at: string }[]}
        />
      </div>
    </div>
  );
}