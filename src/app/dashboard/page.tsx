import { requireUser } from "@/lib/auth/guards";

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {user.name || user.email}</h1>
      <p className="text-sm text-muted-foreground">Roles: {user.app_roles.join(", ")}</p>
    </main>
  );
}
