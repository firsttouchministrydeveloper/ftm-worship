import { createClient } from "@/lib/supabase/server";
import { ServiceTypesEditor } from "@/components/admin/service-types-editor";

export default async function ServiceTypesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_types")
    .select("id, name, recurring_day, recurring_time, notes, active")
    .order("recurring_day");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Service Types</h2>
      <ServiceTypesEditor initial={data ?? []} />
    </div>
  );
}
