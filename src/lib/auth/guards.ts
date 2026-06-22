import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type CurrentUser = Database["public"]["Tables"]["users"]["Row"];

export async function requireUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) redirect("/signin");
  return data;
}

export async function requireRole(roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  const hasRole = user.app_roles.some((r) => roles.includes(r));
  if (!hasRole) redirect("/dashboard");
  return user;
}
