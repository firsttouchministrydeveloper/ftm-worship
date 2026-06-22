import { createClient } from "@/lib/supabase/server";
import { InstrumentRolesEditor } from "@/components/admin/instrument-roles-editor";

export default async function InstrumentRolesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("instrument_roles")
    .select("id, name, display_order, active")
    .order("display_order");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Instrument Roles</h2>
      <InstrumentRolesEditor initial={data ?? []} />
    </div>
  );
}
