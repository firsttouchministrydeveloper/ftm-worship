"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const TimeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  recurring_day: z.coerce.number().int().min(0).max(6),
  recurring_time: z.string().regex(TimeRegex).nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
});

const UpdateSchema = CreateSchema.partial().extend({
  id: z.string().uuid(),
  active: z.boolean().optional(),
});

export async function createServiceType(input: unknown) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("service_types").insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/service-types");
  return { ok: true as const };
}

export async function updateServiceType(input: unknown) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { id, ...patch } = parsed.data;
  const { error } = await supabase.from("service_types").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/service-types");
  return { ok: true as const };
}
