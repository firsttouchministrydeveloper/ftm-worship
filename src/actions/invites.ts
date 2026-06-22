"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/resend/client";
import { generateInviteToken } from "@/lib/invites/token";

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(80).optional().default(""),
  intended_app_roles: z.array(z.enum(["PASTOR", "WORSHIP_HEAD", "WORSHIP_LEADER", "MEMBER"])).min(1),
  intended_instrument_role_ids: z.array(z.string().uuid()).default([]),
});

const INVITE_TTL_DAYS = 7;

export async function createInvite(input: unknown) {
  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000).toISOString();

  const { error } = await supabase.from("invites").insert({
    email: parsed.data.email,
    name: parsed.data.name || null,
    intended_app_roles: parsed.data.intended_app_roles,
    intended_instrument_role_ids: parsed.data.intended_instrument_role_ids,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  });
  if (error) return { ok: false as const, error: error.message };

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  try {
    await resend().emails.send({
      from: "FTM Worship <onboarding@resend.dev>",
      to: parsed.data.email,
      subject: "You're invited to the worship team app",
      text:
        `Hi${parsed.data.name ? " " + parsed.data.name : ""},\n\n` +
        `You've been invited to join the worship team app.\n\n` +
        `Accept your invite here: ${inviteUrl}\n\n` +
        `This link expires in ${INVITE_TTL_DAYS} days.`,
    });
  } catch (e) {
    // Email failed — invite row exists; surface to admin
    return { ok: false as const, error: `Invite created but email failed: ${(e as Error).message}` };
  }

  revalidatePath("/admin/members");
  return { ok: true as const, inviteUrl };
}
