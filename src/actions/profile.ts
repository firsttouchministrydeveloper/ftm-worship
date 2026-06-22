"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  avatar_url: z.string().url().nullable().optional(),
});

export async function updateProfile(input: unknown) {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("users")
    .update({ name: parsed.data.name, avatar_url: parsed.data.avatar_url ?? null })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
