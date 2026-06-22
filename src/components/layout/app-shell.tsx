import Link from "next/link";
import { UserMenu } from "./user-menu";
import type { CurrentUser } from "@/lib/auth/guards";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const isAdmin = user.app_roles.some((r) => r === "PASTOR" || r === "WORSHIP_HEAD");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <Link href="/dashboard" className="font-semibold">FTM Worship</Link>
          <UserMenu name={user.name || user.email} isAdmin={isAdmin} />
        </div>
      </header>
      <main className="flex-1 container mx-auto p-6">{children}</main>
    </div>
  );
}
