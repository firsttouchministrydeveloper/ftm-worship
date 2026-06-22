import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { MembersTable } from "@/components/admin/members-table";

type UirRow = {
  user_id: string;
  instrument_roles: { name: string } | { name: string }[] | null;
};

export default async function MembersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, name, email, app_roles, active")
    .order("name");

  const { data: uir } = await supabase
    .from("user_instrument_roles")
    .select("user_id, instrument_roles(name)");

  const byUser: Record<string, string[]> = {};
  for (const row of (uir ?? []) as UirRow[]) {
    const ir = row.instrument_roles;
    const name = Array.isArray(ir) ? ir[0]?.name : ir?.name;
    if (!name) continue;
    (byUser[row.user_id] ??= []).push(name);
  }

  const members = (users ?? []).map((u) => ({
    ...u,
    instrument_role_names: byUser[u.id] ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        <Button nativeButton={false} render={<Link href="/admin/members/invite">Invite member</Link>} />
      </div>
      <MembersTable members={members} />
    </div>
  );
}
