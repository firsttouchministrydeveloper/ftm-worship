import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold">Welcome, {user.name || user.email}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Roles: {user.app_roles.join(", ")}</p>
    </AppShell>
  );
}
