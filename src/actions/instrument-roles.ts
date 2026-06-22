"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  display_order: z.coerce.number().int().min(0).default(0),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  display_order: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function createInstrumentRole(input: unknown) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("instrument_roles").insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/instrument-roles");
  return { ok: true as const };
}

export async function updateInstrumentRole(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { id, ...patch } = parsed.data;
  const { error } = await supabase.from("instrument_roles").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/instrument-roles");
  return { ok: true as const };
}
