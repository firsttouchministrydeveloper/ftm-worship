import { createClient } from "@/lib/supabase/server";
import { InviteDialog } from "@/components/admin/invite-dialog";

export default async function InvitePage() {
  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("instrument_roles")
    .select("id, name")
    .eq("active", true)
    .order("display_order");

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-semibold">Invite a member</h2>
      <InviteDialog instrumentRoles={roles ?? []} />
    </div>
  );
}
