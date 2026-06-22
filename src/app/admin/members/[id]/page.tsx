import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MemberEditForm } from "@/components/admin/member-edit-form";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, app_roles, active")
    .eq("id", id)
    .single();
  if (!user) notFound();

  const { data: allRoles } = await supabase
    .from("instrument_roles")
    .select("id, name")
    .eq("active", true)
    .order("display_order");

  const { data: uir } = await supabase
    .from("user_instrument_roles")
    .select("instrument_role_id")
    .eq("user_id", id);

  const selected = (uir ?? []).map((r) => r.instrument_role_id);

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-semibold">{user.name || user.email}</h2>
      <MemberEditForm member={user} instrumentRoles={allRoles ?? []} initialSelected={selected} />
    </div>
  );
}
