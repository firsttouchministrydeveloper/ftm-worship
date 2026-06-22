"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  id: z.string().uuid(),
  app_roles: z.array(z.enum(["PASTOR", "WORSHIP_HEAD", "WORSHIP_LEADER", "MEMBER"])).min(1).optional(),
  instrument_role_ids: z.array(z.string().uuid()).optional(),
  active: z.boolean().optional(),
});

export async function updateMember(input: unknown) {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { id, app_roles, instrument_role_ids, active } = parsed.data;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  if (app_roles || active !== undefined) {
    const patch: {
      app_roles?: ("PASTOR" | "WORSHIP_HEAD" | "WORSHIP_LEADER" | "MEMBER")[];
      active?: boolean;
    } = {};
    if (app_roles) patch.app_roles = app_roles;
    if (active !== undefined) patch.active = active;
    const { error } = await supabase.from("users").update(patch).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
  }

  if (instrument_role_ids) {
    const { error: delError } = await supabase
      .from("user_instrument_roles")
      .delete()
      .eq("user_id", id);
    if (delError) return { ok: false as const, error: delError.message };
    if (instrument_role_ids.length > 0) {
      const rows = instrument_role_ids.map((ir) => ({ user_id: id, instrument_role_id: ir }));
      const { error } = await supabase.from("user_instrument_roles").insert(rows);
      if (error) return { ok: false as const, error: error.message };
    }
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${id}`);
  return { ok: true as const };
}
