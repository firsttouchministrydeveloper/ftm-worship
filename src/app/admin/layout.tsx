import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["PASTOR", "WORSHIP_HEAD"]);
  return (
    <AppShell user={user}>
      <nav className="mb-6 flex gap-4 border-b pb-2 text-sm">
        <Link href="/admin/members">Members</Link>
        <Link href="/admin/instrument-roles">Instrument Roles</Link>
        <Link href="/admin/service-types">Service Types</Link>
      </nav>
      {children}
    </AppShell>
  );
}
