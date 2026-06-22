"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SaveSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  device_label: z.string().max(80).optional(),
});

const RemoveSchema = z.object({
  endpoint: z.string().url(),
});

export async function savePushSubscription(input: unknown) {
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, ...parsed.data, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,endpoint" }
    );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function removePushSubscription(input: unknown) {
  const parsed = RemoveSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
