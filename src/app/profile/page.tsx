import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coming in Task 10.</p>
    </AppShell>
  );
}
