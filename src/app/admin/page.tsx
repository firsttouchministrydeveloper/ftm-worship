import { requireRole } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminPage() {
  const user = await requireRole(["PASTOR", "WORSHIP_HEAD"]);
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Members, instrument roles, and service types live here.</p>
    </AppShell>
  );
}
